import React, {useEffect} from 'react';
import logo from './logo.svg';
import './App.css';

import { parseEther } from 'viem' 
import { useOpenConnectModal } from '@0xsequence/kit'
import { useDisconnect, useAccount, useSendTransaction } from 'wagmi'
import { useMutex } from 'react-context-mutex';

import { ethers } from 'ethers'

function App() {
  const MutexRunner = useMutex();
  const mutexMint = new MutexRunner('sendMint');
  const mutexTransfer = new MutexRunner('sendTransfer');

  const { address } = useAccount()
  const { setOpenConnectModal } = useOpenConnectModal()
  const { disconnect } = useDisconnect()

  const { isConnected } = useAccount()
  const { data: hash, sendTransaction } = useSendTransaction() 

  const onClick = () => {
    setOpenConnectModal(true)
  }

  const sendMint = () => {
    if(address && !mutexMint.isLocked()) {
      mutexMint.run(async () => {
        try {

          mutexMint.lock();

          const erc721Interface = new ethers.utils.Interface([
            'function mint(address to, uint256 tokenId, uint256 amount, bytes data) returns ()'
          ])

          const data = erc721Interface.encodeFunctionData(
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
          console.log('testing')
          mutexTransfer.lock();

          const erc1155Interface = new ethers.utils.Interface([
            'function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _amount, bytes _data) returns ()'
          ])

          const data = erc1155Interface.encodeFunctionData(
            'safeTransferFrom', [address, address, Math.floor(Math.random() * 6), 1, '0x00']
          )

          console.log(data)

          sendTransaction({ to: '0x1693ffc74edbb50d6138517fe5cd64fd1c917709', data: `0x${data.slice(2,data.length)}`, gas: null }) 
        } catch (err) {
          console.log(err)
          mutexTransfer.unlock();
        }
      })
    }
  }

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
      {isConnected && <button onClick={()=> disconnect()}>disconnect</button>}
      <br/>
      <br/>
      {isConnected && <button onClick={()=> sendMint()}>mint</button>}
      <br/>
      <br/>
      {isConnected && <button onClick={()=> sendMintUnMutex()}>mint unmutex</button>}
      <br/>
      <br/>
      {isConnected && <button onClick={()=> sendTransfer()}>transfer</button>}
    </div>
  )
}

export default App;