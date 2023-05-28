import SocialLogin, { socialLoginSDK } from "@biconomy/web3-auth";
// import "@biconomy/web3-auth/dist/src/style.css";

import { ChainId } from "@biconomy/core-types";
import SmartAccount from "@biconomy/smart-account";

import { ethers } from 'ethers'
import { useEffect, useState } from "react";

const HomePage = () => {

  const [privateKey, setPrivateKey] = useState()
  const [smartAccount, setSmartAccount] = useState()

  const [account, setAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const socialLogin = new SocialLogin()

  const checkLogin = async () => {
    console.log('test2', socialLoginSDK.clientId)
    await socialLogin.init({
      chainId: '0x13881',
      network: 'testnet'
    })

    if (!socialLogin?.provider) return;
    // create a provider from the social login provider that 
    // will be used by the smart account package of the Biconomy SDK
    const provider = new ethers.providers.Web3Provider(
      socialLogin.provider,
    );
    // get list of accounts available with the provider
    const accounts = await provider.listAccounts();
    console.log(accounts.length, accounts)

    
    // Initialize the Smart Account
    // All values are optional except networkConfig only in the case of gasless dappAPIKey is required
    let options = {
      activeNetworkId: ChainId.POLYGON_MUMBAI,
      supportedNetworksIds: [ChainId.POLYGON_MUMBAI],
      networkConfig: [
        {
          chainId: ChainId.POLYGON_MUMBAI,
          // Dapp API Key you will get from new Biconomy dashboard that will be live soon
          // Meanwhile you can use the test dapp api key mentioned above
          dappAPIKey: process.env.NEXT_PUBLIC_BICONOMY_KEY,
        },
      ]
    }

    // this provider is from the social login which we created in last setup
    let smartAccount = new SmartAccount(provider, options);
    const acc = await smartAccount.init();

    const pvK = await socialLogin.getPrivateKey()

    setPrivateKey(pvK)
    setSmartAccount(acc)
    setAccount(accounts[0])
    setLoading(false)
  }

  useEffect(() => {

    setLoading(true)
    checkLogin()
  }, [account])

  const openSocialSignon = async () => {
    // pops up the UI widget
    await socialLogin.socialLogin('google')

    setLoading(true)
    checkLogin()
  }

  const logout = async () => {
    await socialLogin.logout()
    setAccount('')
    setSmartAccount()

  }


  if (!account)
    return <>
      <div onClick={openSocialSignon}>Sign In</div>
    </>

  return <>
    <p onClick={logout}>hi</p>
  </>
}

export default HomePage
