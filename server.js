const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Account, ec, json, stark, RpcProvider, hash, CallData, cairo, typedData } = require('starknet');
const { newMerchant , getUserAccount, updateMerchanBalance, payment } = require('./DB/querys.supabase');

const app = express();
app.use(cors());
dotenv.config();

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

const port = process.env.PORT || 8080;
const BLAST_KEY = process.env.BLAST_KEY;
const CHIPI_PRIVATE_KEY = process.env.CHIP_PRIVATE_KEY;
const CHIPI_PUBLIC_KEY = process.env.CHIP_PUBLIC_KEY;
const ETH_SEPOLIA_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const AVNU_PAYMASTER_KEY = process.env.AVNU_PAYMASTER_KEY;
const AVNU_BASE_URL = `https://sepolia.api.avnu.fi/paymaster/v1`;

const provider = new RpcProvider({ nodeUrl: `https://starknet-sepolia.blastapi.io/${BLAST_KEY}` });
//new Argent X account v0.2.3
const argentXproxyClassHash = '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918';
const argentXaccountClassHash =
  '0x029927c8af6bccf3f6fda035981e765a7bdbf18a2dc0d630494f8758aa908e2b';

const chipi_account = new Account(provider, CHIPI_PUBLIC_KEY, CHIPI_PRIVATE_KEY);

const createAccount = async () => {
    // Generate public and private key pair.
    const privateKeyAX = stark.randomAddress();
    console.log('AX_ACCOUNT_PRIVATE_KEY=', privateKeyAX);
    const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);
    console.log('AX_ACCOUNT_PUBLIC_KEY=', starkKeyPubAX);
    // Calculate future address of the ArgentX account
    const AXproxyConstructorCallData = CallData.compile({
        implementation: argentXaccountClassHash,
        selector: hash.getSelectorFromName('initialize'),
        calldata: CallData.compile({ signer: starkKeyPubAX, guardian: '0' }),
    });
    const AXcontractAddress = hash.calculateContractAddressFromHash(
        starkKeyPubAX,
        argentXproxyClassHash,
        AXproxyConstructorCallData,
        0
    );
    console.log('Precalculated account address=', AXcontractAddress);

    // consulta el balance de la cuenta chipi en eth
    // send eth to the new account account
    const sendEth = await chipi_account.execute([{
        contractAddress: ETH_SEPOLIA_ADDRESS,
        entrypoint: 'balance_of',
        calldata: CallData.compile({
            recipient: chipi_account.address
            // amount: cairo.uint256(10000),
        }),
    }]);
    console.log('sendEth=', sendEth);
    await provider.waitForTransaction(sendEth.transaction_hash);
    return { publicKey: starkKeyPubAX, address: AXcontractAddress, privateKey: privateKeyAX };
}

const makeTransfer = async (merchant_account, to, amount) => {
    const transfer = await merchant_account.execute([{
        contractAddress: ETH_SEPOLIA_ADDRESS,
        entrypoint: 'transfer',
        calldata: CallData.compile({
            to,
            amount: cairo.uint256(amount),
        }),
    }]);
    console.log('transfer=', transfer);
    await provider.waitForTransaction(transfer.transaction_hash);
    return transfer.transaction_hash;
};

const transferTypedDataPaymaster = async (merchant_account, balance) => {
    const response = await fetch(`${AVNU_BASE_URL}/build-typed-data`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "api-key": AVNU_PAYMASTER_KEY
        },
        body: JSON.stringify({
            "userAddress": merchant_account.address,
            "calls": [
                {
                "contractAddress": ETH_SEPOLIA_ADDRESS,
                "entrypoint": "transfer",
                "calldata": [
                    chipi_account.address, //"0x03F1242961727C5eA1215E78548B83fd311a7b5d171F3934906bB183274CDc0E",
                    balance
                ]
                }
            ]
        })
    });
    return response.json();
}

const transferExecutePaymaster = async (data, signedData, merchant_account) => {
    const response = await fetch(`${AVNU_BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "api-key": AVNU_PAYMASTER_KEY
        },
        body: JSON.stringify({
            userAddress: merchant_account.address,
            signature: [signedData],
            typedData: data
        })
    });
    return response.json();
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/create-account', async (req, res, next) => {
    try {
        const { email, businessName } = req.body;
        const account = await createAccount();
        console.log({ ...account });
        newMerchant({ email, businessName, ...account });
        res.status(200).json({ ...account });
    } catch (error) {
        next(error)
    }
});

app.get('/get-account', async (req, res, next) => {
    try {
        const { email } = req.body;
        const account = await getUserAccount(email)
        console.log({ ...account });
        res.status(200).json({ ...account });
    } catch (error) {
        next(error)
    }
});

app.post('/payment', async (req, res, next) => {
    try {
        const { email, amount } = req.body;
        const payment = await payment(email, amount);
        console.log({ ...payment });
        res.status(200).json({ ...payment });
    } catch (error) {
        next(error)
    }
});

app.post('/withdraw', async (req, res, next) => {
    try {
        const { email, amount } = req.body;
        const account = await getUserAccount(email);
        const prepareTransfer = await transferTypedDataPaymaster(account, amount);
        console.log('prepareTransfer=', prepareTransfer);
        const merchant_account = new Account(provider, account.publicKey, account.privateKey);
        const signedData = await merchant_account.signMessage(prepareTransfer);
        const withdraw = await transferExecutePaymaster(prepareTransfer, signedData, merchant_account);
        console.log('withdraw=', withdraw);
        if(withdraw.transaction_hash) {
            await updateMerchanBalance(email, amount);
        }
        res.status(200).json({ ...withdraw });
    } catch (error) {
        next(error)
    }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})