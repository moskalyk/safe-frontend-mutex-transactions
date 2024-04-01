import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { KitProvider } from '@0xsequence/kit'
import { getDefaultConnectors } from '@0xsequence/kit-connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http, WagmiProvider, WagmiConfig } from 'wagmi'
import { mainnet, polygon, Chain } from 'wagmi/chains'

const queryClient = new QueryClient() 

function Dapp() {
  const chains = [mainnet, polygon] as [Chain, ...Chain[]]
  
  const projectAccessKey = 'AQAAAAAAAD_rgakMniSS8s4oosPHdzTjnfI'

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

  const kitConfig = {

  }
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}> 
        <KitProvider config={{ defaultTheme: "light", signIn: { showEmailInput: false } }}>
          <App />
        </KitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Dapp />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
