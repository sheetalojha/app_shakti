import React, { useEffect, useState } from "react";
import lighthouse from '@lighthouse-web3/sdk';

import { ethers } from "ethers";

const Card = ({ note, smartAccount, index }) => {
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(true)


  const encryptionSignature = async () => {
    const signer = smartAccount.getsigner();
    const address = await signer.getAddress();
    const messageRequested = (await lighthouse.getAuthMessage(address)).data.message;
    const signedMessage = await signer.signMessage(messageRequested);
    return ({
      signedMessage: signedMessage,
      publicKey: address
    });
  }

  /* Decrypt file */
  const decrypt = async (cid) => {
    // Fetch file encryption key
    const { publicKey, signedMessage } = await encryptionSignature();
    /*
      fetchEncryptionKey(cid, publicKey, signedMessage)
        Parameters:
          CID: CID of the file to decrypt
          publicKey: public key of the user who has access to file or owner
          signedMessage: message signed by the owner of publicKey
    */
    const keyObject = await lighthouse.fetchEncryptionKey(
      cid,
      publicKey,
      signedMessage
    );

    // Decrypt file
    /*
      decryptFile(cid, key, mimeType)
        Parameters:
          CID: CID of the file to decrypt
          key: the key to decrypt the file
          mimeType: default null, mime type of file
    */

    const decrypted = await lighthouse.decryptFile(cid, keyObject.data.key);
    /*
      Response: blob
    */
   console.log(decrypted)

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      console.log(text)
      setContent(text)
      setLoading(false)
    };

    reader.readAsText(decrypted);
  }

  const makePublic = async () => {

    // Verifies the data fetched is correct.
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));

    if (hash != note.hashOfOriginalNote) return; // This means the public content is not same as encrypted content.

    const output = await lighthouse.uploadText(content, process.env.NEXT_PUBLIC_LIGHTHOUSE_STORAGE);

    // One needs to prepare the transaction data
    // Here we will be transferring ERC 20 tokens from the Smart Contract Wallet to an address
    const createNoteInterface = new ethers.utils.Interface([
      'function makeNotePublic(uint256 index, string unencryptedContentCID)'
    ])

    // Encode an ERC-20 token transfer to recipientAddress of the specified amount
    const encodedData = createNoteInterface.encodeFunctionData(
      'makeNotePublic', [index, output.data.Hash]
    )

    // You need to create transaction objects of the following interface
    const tx = {
      to: process.env.NEXT_PUBLIC_SHAKTI_CONTRACT, // destination smart contract address
      data: encodedData
    }

    // Optional: Transaction subscription. One can subscribe to various transaction states
    // Event listener that gets triggered once a hash is generetaed
    smartAccount.on('txHashGenerated', (response) => {
      console.log('txHashGenerated event received via emitter', response);
    });
    smartAccount.on('onHashChanged', (response) => {
      console.log('onHashChanged event received via emitter', response);
    });
    // Event listener that gets triggered once a transaction is mined
    smartAccount.on('txMined', (response) => {
      console.log('txMined event received via emitter', response);
    });
    // Event listener that gets triggered on any error
    smartAccount.on('error', (response) => {
      console.log('error event received via emitter', response);
    });

    // Sending gasless transaction
    const txResponse = await smartAccount.sendTransaction({ transaction: tx });
    console.log('userOp hash', txResponse.hash);
    // If you do not subscribe to listener, one can also get the receipt like shown below 
    const txReciept = await txResponse.wait();
    console.log('Tx hash', txReciept.transactionHash);

    setIsPublic(true)
  }

  useEffect(() => {
    if (note.unencryptedContentCID != "") setIsPublic(true);

    decrypt(note.encryptedContentCID)
  }, [])

  return <div className="card w-96 bg-base-100 shadow-xl">
    <div className="card-body">
      <p>{loading ? "Loading..." : content}</p>
      <div class="badge badge-md">28.05.2023</div>{!isPublic ? <div className="badge badge-secondary">Private</div> : <></>}
      <div className="card-actions justify-end">
        {!isPublic ? <button onClick={makePublic} className="btn btn-primary">Make Public</button> : <></>}
      </div>
    </div>
  </div>
}

export default Card;