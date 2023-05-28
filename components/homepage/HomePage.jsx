import SocialLogin from "@biconomy/web3-auth";
import "@biconomy/web3-auth/dist/src/style.css";

import { ChainId } from "@biconomy/core-types";
import SmartAccount from "@biconomy/smart-account";

import { ethers } from 'ethers'
import { useEffect, useState } from "react";
import Image from "next/image";
import Dashboard from "./Dashboard";

const HomePage = () => {

  const [privateKey, setPrivateKey] = useState()
  const [smartAccount, setSmartAccount] = useState()

  const [account, setAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const socialLogin = new SocialLogin()

  const checkLogin = async () => {

    if (!socialLogin?.provider) return;
    // create a provider from the social login provider that 
    // will be used by the smart account package of the Biconomy SDK
    const provider = new ethers.providers.Web3Provider(
      socialLogin.provider,
    );
    // get list of accounts available with the provider
    const accounts = await provider.listAccounts();
    if (accounts.length == 0) return;

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

  const initSocial = async () => {
    await socialLogin.init({
      chainId: '0x13881',
      network: 'testnet'
    })
  }

  useEffect(() => {
    initSocial()
  }, [])

  const openSocialSignon = async () => {
    if (!socialLogin?.provider)
      await socialLogin.socialLogin('google')

    setLoading(true)
    checkLogin()
  }

  const logout = async () => {
    await socialLogin.logout()

    await initSocial()
    setAccount('')
    setSmartAccount()
    setPrivateKey()
  }

  if (loading)
    return <>
      <Image src={'/assets/shakti.png'} height={100} width={100} />
      <h3>Loading Shakti...</h3>
    </>


  if (account == '')
    return <>
      <Image src={'/assets/shakti.png'} height={100} width={100} />
      <h3 className="mb-2 font-bold text-2xl">Hi, I am Shakti ⚡️</h3>
      <div className="btn btn-active btn-secondary" onClick={openSocialSignon}>Sign In</div>
    </>

  return <Dashboard account={account} privateKey={privateKey} smartAccount={smartAccount} logout={logout} />
}

export default HomePage
