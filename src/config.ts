import { arbitrumSepolia, Chain } from 'wagmi/chains'
import { getDefaultConnectors } from '@0xsequence/kit-connectors'
import { createConfig, http } from 'wagmi'

const chains = [arbitrumSepolia] as [Chain, ...Chain[]]
  
const projectAccessKey = process.env.REACT_APP_PROJECTACCESSKEY!;
const walletConnectProjectId = process.env.REACT_APP_WALLETCONNECTID!;

const connectors = getDefaultConnectors({
    walletConnectProjectId: '458215b98fce3f9f700f2c233b932ae1',
    defaultChainId: 421614,
    appName: 'demo app',
    projectAccessKey
})

const transports: any = {}

chains.forEach(chain => {
    transports[chain.id] = http()
})

const config = createConfig({
    transports,
    connectors,
    chains
})

export { config }