import { useEffect, useState } from "react";

import { ethers } from 'ethers'
import lighthouse from '@lighthouse-web3/sdk';
import contractABI from './abi.json'

const { Configuration, OpenAIApi } = require("openai");

import Modal from 'react-modal';
import Card from './Card'

// Make sure to bind modal to your appElement (https://reactcommunity.org/react-modal/accessibility/)
// Modal.setAppElement('#yourAppElement');

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    width: "60%",
    transform: 'translate(-50%, -50%)',
  },
};

const Dashboard = ({ logout, privateKey, smartAccount, account }) => {

  const [note, setNote] = useState('')
  const [oldNotes, setOldNotes] = useState([])
  const [chatText, setChatText] = useState()
  const scw = smartAccount.address;

  const [modalIsOpen, setIsOpen] = useState(false);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  const fetchData = async () => {
    const contract = new ethers.Contract(process.env.NEXT_PUBLIC_SHAKTI_CONTRACT, contractABI, smartAccount.provider);
    try {
      const result = await contract.getNotes({ from: scw }); // Replace 'methodName' with the actual method you want to call
      setOldNotes(result)
      console.log('Result:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  useEffect(() => {
    // setOpenAI(openai)
    fetchData()
  }, [])

  const sendTxOnChain = async (cid, hash) => {

    // One needs to prepare the transaction data
    // Here we will be transferring ERC 20 tokens from the Smart Contract Wallet to an address
    const createNoteInterface = new ethers.utils.Interface([
      'function createNote(string encryptedContentCID, string hashOfOriginalNote)'
    ])

    // Encode an ERC-20 token transfer to recipientAddress of the specified amount
    const encodedData = createNoteInterface.encodeFunctionData(
      'createNote', [cid, hash]
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

    fetchData()
    setNote('')
  }

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

  const save = async () => {
    if (note.length < 3) return;

    const sig = await encryptionSignature();
    const response = await lighthouse.textUploadEncrypted(
      note,
      process.env.NEXT_PUBLIC_LIGHTHOUSE_STORAGE,
      sig.publicKey,
      sig.signedMessage,
    );
    console.log(response.data.Hash);

    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(note));
    console.log(hash)
    const promises = [sendMessage(),
    sendTxOnChain(response.data.Hash, hash)]

    Promise.all(promises)
  }

  const sendMessage = async () => {
    try {
      console.log(process.env.NEXT_PUBLIC_CHATGPT)
      const configuration = new Configuration({
        apiKey: process.env.NEXT_PUBLIC_CHATGPT,
      });

      const opena = new OpenAIApi(configuration);
      const response = await opena.createCompletion({
        model: "text-davinci-003",
        prompt: `read the note written by a female employee of a company: "${note}". Act as her friend and help her in making her good mind. 

        Make the answer sound more natural like a real person, your name is Shakti and be her friend. Also, write your message in a very easy to read manner. Reply in about 500 words.`,
        temperature: 0,
        max_tokens: 2000,
      });

      const reply = response.data.choices[0].text;
      setChatText(reply)
      openModal()
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <div className="w-full h-full flex-1">
    <div className="alert shadow-lg">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info flex-shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>{scw}</span>
      </div>
      <div className="flex-none">
        <button onClick={logout} className="btn btn-sm btn-primary">Logout</button>
      </div>
    </div>

    <div className="mt-4">
      <div className="flex flex-col max-w-2xl">
        <h1 className="text-xl font-bold mb-2">Hi 👋🏼, Create a new note:</h1>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hey, what happened? Feel free to share your experience." className="textarea textarea-bordered textarea-lg w-full max-w-xl" ></textarea>
        <button onClick={save} class="btn btn-secondary w-min mt-2">Save</button>
        <button onClick={openModal} class="btn btn-secondary w-min mt-2">Open Modal</button>
      </div>

    </div>
    <div className="mt-6">
      <h1 className="text-xl font-bold mb-2">Past Experiences:</h1>
      <div className="w-full grid grid-rows-2 gap-4 grid-flow-row-dense ">
        {oldNotes.map((note, index) => {
          return <Card key={note.encryptedContentCID} index={index} smartAccount={smartAccount} note={note} />
        })}
      </div>
    </div>

    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      style={customStyles}
    >
      <h2>From Shakti: ⚡️</h2>
      <button onClick={closeModal}>close</button>
      <p>
        {chatText ?? ''}
      </p>
    </Modal>
  </div>
}

export default Dashboard
