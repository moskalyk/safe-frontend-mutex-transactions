import React, {useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';

import { parseEther } from 'viem' 
import { useOpenConnectModal } from '@0xsequence/kit'
import { useDisconnect, useAccount, useSendTransaction, useConnect } from 'wagmi'
import { useMutex } from 'react-context-mutex';

import { ethers } from 'ethers'

import { sequence } from '0xsequence';
import { SequenceIndexer } from '@0xsequence/indexer'

const ERC1155Contract = '0x1693ffc74edbb50d6138517fe5cd64fd1c917709'
const MarketPlaceContract = '0xB537a160472183f2150d42EB1c3DD6684A55f74c'
const ArbSepoliaUSDCContract = '0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d'

function App() {

  sequence.initWallet(process.env.REACT_APP_PROJECT_ACCESSKEY!, {defaultNetwork: 'arbitrum-sepolia'})
  
  const MutexRunner = useMutex();
  const mutexMint = new MutexRunner('sendMint');
  const mutexTransfer = new MutexRunner('sendTransfer');
  const mutexApproveERC1155 = new MutexRunner('sendApproveERC1155');
  const mutexApproveERC20 = new MutexRunner('sendApproveERC20');

  const { address } = useAccount()
  const { setOpenConnectModal } = useOpenConnectModal()
  const { disconnect } = useDisconnect()

  const { isConnected } = useAccount()
  const { data: hash, sendTransaction } = useSendTransaction() 

  const { connectors } = useConnect();
  const [isSequence, setIsSequence] = useState<boolean>(false)
  const [requestData, setRequestData] = useState<any>(null)
  const [acceptData, setAcceptData] = useState<any>(null)

  useEffect(() => {
    connectors.map(async (connector) => {
      if ((await connector.isAuthorized()) && connector.id === "sequence") {
        setIsSequence(true);
      }
    });
  }, [isConnected]);

  const onClick = () => {
    setOpenConnectModal(true)
  }

  async function checkERC1155Approval(ownerAddress: string, operatorAddress: string) {

    const abi = [
      "function isApprovedForAll(address account, address operator) external view returns (bool)"
    ];

    const provider = new ethers.providers.JsonRpcProvider(`https://nodes.sequence.app/arbitrum-sepolia/${process.env.REACT_APP_PROJECT_ACCESSKEY}`);
    const contract = new ethers.Contract(ERC1155Contract, abi, provider);
    const isApproved = await contract.isApprovedForAll(ownerAddress, operatorAddress);
    return isApproved
  }

  const createRequest = async () => {
    const sequenceMarketInterface = new ethers.utils.Interface([
      "function createRequest(tuple(bool isListing, bool isERC1155, address tokenContract, uint256 tokenId, uint256 quantity, uint96 expiry, address currency, uint256 pricePerToken)) external nonReentrant returns (uint256 requestId)"
    ]);

    const amountBigNumber = ethers.utils.parseUnits(String('0.01'), 6); // ensure to use the proper decimals

    const request = {
      isListing: true,
      isERC1155: true,
      tokenContract: ERC1155Contract,
      tokenId: 1,
      quantity: 1,
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 day
      currency: ArbSepoliaUSDCContract,
      pricePerToken: amountBigNumber,
    };

    console.log(request)

    const data = sequenceMarketInterface.encodeFunctionData("createRequest", [
      request,
    ]);

    setRequestData(data)

    if(await checkERC1155Approval(address!,MarketPlaceContract)){
      sendTransaction({
        to: MarketPlaceContract,
        data: `0x${data.slice(2,data.length)}`,
        gas: null
      })

    } else {

      const erc1155Interface = new ethers.utils.Interface([
        "function setApprovalForAll(address _operator, bool _approved) returns ()"
      ]);

      // is not approved
      const dataApprove = erc1155Interface.encodeFunctionData(
        "setApprovalForAll",
        ["0xB537a160472183f2150d42EB1c3DD6684A55f74c", true],
      );

      const txApprove = {
        to: ERC1155Contract,
        data: dataApprove
      }

      const tx = {
        to: MarketPlaceContract,
        data: data
      }

      if (isSequence) { // is a sequence wallet
        const wallet = sequence.getWallet()
        const signer = wallet.getSigner(421614)

        try {
          const res = signer.sendTransaction([txApprove, tx])
          console.log(res)
        } catch (err) {
          console.log(err)
          console.log('user closed the wallet, or, an error occured')
        }
      } else { // is not a sequence wallet
        mutexApproveERC1155.lock()
        sendTransaction({
          to: ERC1155Contract,
          data: `0x${dataApprove.slice(2,data.length)}`,
          gas: null
        })
      }
    }
  };

  useEffect(() => {
    if(mutexApproveERC1155.isLocked() && hash){
      sendTransaction({
        to: MarketPlaceContract,
        data: `0x${requestData.slice(2,requestData.length)}`,
        gas: null
      })
      mutexApproveERC1155.unlock()
    }
  }, [requestData, hash])

  useEffect(() => {
    console.log(hash)
  }, [hash])

  const sendMint = () => {
    if(address && !mutexMint.isLocked()) {
      mutexMint.run(async () => {
        try {
          mutexMint.lock();

          const erc1155Interface = new ethers.utils.Interface([
            'function mint(address to, uint256 tokenId, uint256 amount, bytes data) returns ()'
          ])

          const data = erc1155Interface.encodeFunctionData(
            'mint', [address, Math.floor(Math.random() * 6), 1, '0x00']
          )

          sendTransaction({ to: '0x1693ffc74edbb50d6138517fe5cd64fd1c917709', data: `0x${data.slice(2,data.length)}`, gas: null }) 
        } catch (err) {
          console.log(err)
          mutexMint.unlock();
        }
      })
    }
  }

  const sendMintUnMutex = () => {
    if(address) {
        try {
          const erc1155Interface = new ethers.utils.Interface([
            'function mint(address to, uint256 tokenId, uint256 amount, bytes data) returns ()'
          ])

          const data = erc1155Interface.encodeFunctionData(
            'mint', [address, Math.floor(Math.random() * 6), 1, '0x00']
          )

          sendTransaction({ to: '0x1693ffc74edbb50d6138517fe5cd64fd1c917709', data: `0x${data.slice(2,data.length)}`, gas: null }) 
        } catch (err) {
          console.log(err)
        }
    }
  }

  const sendTransfer = () => {
    if(address && !mutexTransfer.isLocked()) {
      mutexTransfer.run(async () => {
        try {
          mutexTransfer.lock();

          const erc1155Interface = new ethers.utils.Interface([
            'function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _amount, bytes _data) returns ()'
          ])

          const data = erc1155Interface.encodeFunctionData(
            'safeTransferFrom', [address, address, Math.floor(Math.random() * 6), 1, '0x00']
          )

          sendTransaction({ to: '0x1693ffc74edbb50d6138517fe5cd64fd1c917709', data: `0x${data.slice(2,data.length)}`, gas: null }) 
        } catch (err) {
          console.log(err)
          mutexTransfer.unlock();
        }
      })
    }
  }

  async function checkERC20Approval(ownerAddress: string, spenderAddress: string, tokenContractAddress: string, requiredAmount: string) {
    
    const abi = [
      "function allowance(address owner, address spender) external view returns (uint256)"
    ];
  
    const provider = new ethers.providers.JsonRpcProvider(`https://nodes.sequence.app/arbitrum-sepolia/${process.env.REACT_APP_PROJECT_ACCESSKEY}`);
    const contract = new ethers.Contract(tokenContractAddress, abi, provider);
    const allowance = await contract.allowance(ownerAddress, spenderAddress);
  
    const requiredAmountBN = ethers.BigNumber.from(requiredAmount);
    const allowanceBN = ethers.BigNumber.from(allowance);
  
    const isApproved = allowanceBN.gte(requiredAmountBN);
    return isApproved;
  }
  

  const getTopOrder = async (tokenID: string) => {
    const res = await fetch(
      "https://dev-marketplace-api.sequence.app/arbitrum-sepolia/rpc/Marketplace/GetTopOrders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionAddress: "0x1693ffc74edbb50d6138517fe5cd64fd1c917709",
          currencyAddresses: [ArbSepoliaUSDCContract],
          orderbookContractAddress:
            "0xB537a160472183f2150d42EB1c3DD6684A55f74c",
          tokenIDs: [tokenID],
          isListing: true,
          priceSort: "DESC",
        }),
      },
    );
    const result = await res.json();
    console.log(result)
    return result.orders[0]
  }

  const checkERC20Balance = async (requiredAmount: any) => {
    const indexer = new SequenceIndexer('https://arbitrum-sepolia-indexer.sequence.app', process.env.REACT_APP_PROJECT_ACCESSKEY)

    // try any contract and account address you'd like :)
    const contractAddress = ArbSepoliaUSDCContract
    const accountAddress = address

    // query Sequence Indexer for all nft balances of the account on Polygon
    const tokenBalances = await indexer.getTokenBalances({
      contractAddress: contractAddress,
      accountAddress: accountAddress,
      includeMetadata: true
    })

    let hasEnoughBalance = false

    tokenBalances.balances.map((token) => {
      const tokenBalanceBN = ethers.BigNumber.from(token.balance);
      const requiredAmountBN = ethers.BigNumber.from(requiredAmount);
      console.log(tokenBalanceBN.toString())
      console.log(requiredAmountBN.toString())
      if(token.contractAddress == ArbSepoliaUSDCContract && tokenBalanceBN.gte(requiredAmountBN)){
        hasEnoughBalance = true
      }
    })
    return hasEnoughBalance
  }

  const acceptOrder = async () => {

    const topOrder: any = await getTopOrder('1') 
    const requiredAmount = topOrder.pricePerToken

    const sequenceMarketInterface = new ethers.utils.Interface([
      "function acceptRequest(uint256 requestId, uint256 quantity, address recipient, uint256[] calldata additionalFees, address[] calldata additionalFeeRecipients)",
    ]);

    const data = sequenceMarketInterface.encodeFunctionData(
      "acceptRequest",
      [topOrder.orderId, 1, address, [], []],
    );

    setAcceptData(data)

    const tx = {
      to: MarketPlaceContract, // The contract address of the ERC-20 token, replace with actual contract address
      data: data
    };

    if(await checkERC20Balance(requiredAmount)){
      if((await checkERC20Approval(address!,MarketPlaceContract,ArbSepoliaUSDCContract,requiredAmount))){
        sendTransaction({
          to: MarketPlaceContract,
          data: `0x${data.slice(2,data.length)}`,
          gas: null
        })
      } else {

        const erc20Interface = new ethers.utils.Interface([
          "function approve(address spender, uint256 amount) external returns (bool)"
        ]);
        
        const spenderAddress = "0xB537a160472183f2150d42EB1c3DD6684A55f74c";
        const maxUint256 = ethers.constants.MaxUint256;
        const dataApprove = erc20Interface.encodeFunctionData("approve", [spenderAddress, maxUint256]);
        
        if(isSequence){
          const wallet = sequence.getWallet()
          const signer = wallet.getSigner(421614)

          const txApprove = {
            to: ArbSepoliaUSDCContract, // The contract address of the ERC-20 token, replace with actual contract address
            data: dataApprove
          };

          try {
            const res = await signer.sendTransaction([txApprove, tx])
            console.log(res)
          } catch (err) {
            console.log(err)
            console.log('user closed the wallet, or, an error occured')
          }
        } else {
          mutexApproveERC20.lock()

          sendTransaction({
            to: ArbSepoliaUSDCContract,
            data: `0x${dataApprove.slice(2,dataApprove.length)}`,
            gas: null
          })
        }
      }
    } else {
      alert('user does not have enough funds')
    }
  }

  useEffect(() => {
    if(acceptData && mutexApproveERC20.isLocked()){
      sendTransaction({
        to: MarketPlaceContract,
        data: `0x${acceptData.slice(2,acceptData.length)}`,
        gas: null
      })
      mutexApproveERC20.unlock()
    }

  }, [hash, acceptData])

  useEffect(() => {
    if(mutexMint.isLocked()){
      console.log(hash)
      mutexMint.unlock();
    }
  }, [hash])

  useEffect(() => {
    if(!mutexMint.isLocked()){
      console.log(hash)
    }
  }, [hash])

  useEffect(() => {
    if(mutexTransfer.isLocked()){
      console.log(hash)
      mutexTransfer.unlock()
    }
  }, [hash])

  return (
    <div className="App">
      <br/>
      <br/>
      <br/>
      {!isConnected && (
        <button onClick={onClick}>
          Sign in
        </button>
      )}
      <br/>
      <br/>
      Uses Sequence Wallet: {isSequence.toString()}
      <br/>
      <br/>
      {isConnected && (<>
      <button onClick={()=> {setIsSequence(false);disconnect()}}>disconnect</button>
      <br/>
      <br/>
      <button onClick={()=> sendMint()}>mint</button>
      <br/>
      <br/>
      <button onClick={()=> sendMintUnMutex()}>mint unmutex</button>
      <br/>
      <br/>
      <button onClick={()=> sendTransfer()}>transfer</button>
      <br/>
      <br/>
      <button onClick={()=> createRequest()}>sell</button>
      <br/>
      <br/>
      <button onClick={()=> acceptOrder()}>buy top order</button></>)
    }
    </div>
  )
}

export default App;