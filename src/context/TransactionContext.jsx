import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constansts";

export const TransactionContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionsContract  = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );
  return transactionsContract;
};

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [formData, setFormData] = useState({addressTo: '', amount: '', keyword: '', message: ''})
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'))
  const [transactions, setTransactions] = useState([]);
  
  const handleChange = (e, name) => {
      setFormData((prevState) => ({...prevState, [name]: e.target.value}));
  }

  const getAllTransactions = async () => {
      try {
          if (!ethereum) return alert("Por Favor instale Metamask Plugin");
          const transactionsContract = getEthereumContract();
          const availableTransactions = await transactionsContract.getAllTransactions();
          const structuredTransactions = availableTransactions.map((transaction) => ({
              addressTo: transaction.receiver,
              addressFrom: transaction.senders,
              timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
              message: transaction.message,
              keyword: transaction.keyword,
              amount: parseInt(transaction.amount._hex) / (10 ** 18)

          }))
          console.log(structuredTransactions);
          console.log(availableTransactions)
         setTransactions(structuredTransactions);

      } catch (error) {
          console.log(error)
      }
  }
  
  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Por Favor instale Metamask Plugin");
      const accounts = await ethereum.request({ method: "eth_accounts" });
      console.log(accounts);
      if (accounts.length) {
        setCurrentAccount(accounts[0]);

        getAllTransactions();
      } else {
        console.log("no account found");
      }
    } catch (error) {
      console.error(error);
      throw new Error("No Ehereum Object");
    }
  };


    const checkIfTransactionsExist = async () => {
        try {
        const transactionsContract = getEthereumContract();
        const transactionCount = await transactionsContract.getTransactionCount();
        window.localStorage.setItem('transactionCount', transactionCount);
        
        } catch (error) {
           console.error(error);
           throw new Error("No Ehereum Object"); 
        }
        

    }

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Por Favor instale Metamask Plugin");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.error(error);
      throw new Error("No Ehereum Object");
    }
  };

    const sendTransaction = async () => {
        try {

             if (!ethereum) return alert("Por Favor instale Metamask Plugin");
             const { addressTo, amount, keyword, message } = formData;
             const transactionsContract = getEthereumContract();
             const parsedAmount = ethers.utils.parseEther(amount)
             await ethereum.request({ 
                 method: 'eth_sendTransaction',
                 params: [{
                     from: currentAccount,
                     to: addressTo,
                     gas: '0x5208',
                     value: parsedAmount._hex,
                 }]
             });

            const transactionHash = await transactionsContract.addToBlockchain(addressTo, parsedAmount, message, keyword);
            setIsLoading(true);
            console.log(`loading - ${transactionHash.hash}`)
            await transactionHash.wait()
            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`)

            const transactionCount = await transactionsContract.getTransactionCount();
            setTransactionCount(transactionCount.toNumber());
            window.location.reload();

       } catch (error) {
            console.log(error);
            throw new Error("No Ehereum Object");
        }
    }

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactionsExist();
  }, []);

  return (
    <TransactionContext.Provider value={{ connectWallet, currentAccount, formData, handleChange, sendTransaction, transactions, isLoading}}>
      {children}
    </TransactionContext.Provider>
  );
};
