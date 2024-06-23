# Chipi-Pay

This project is called "chipi-back" and it serves as the backend for the Chipi-Pay application.

[Live Endpoints](https://chipi-back-production.up.railway.app)

## Description

Chipi is a web-based platform that allows users to manage their tasks and projects efficiently. This backend repository contains the server-side code for the Chipi application.

## Installation

To run this project locally, follow these steps:

1. Clone the repository: `git clone https://github.com/your-username/chipi-back.git`
2. Navigate to the project directory: `cd chipi-back`
3. Install the dependencies: `npm install`
4. Start the server: `npm start`

## Endpoints

The server.js file in this project contains the following endpoints:

- `/create-account` (POST) - This endpoint is used to create new Starknet Accounts.
- `/get-account` (GET) - This endpoint is used to retrieve a specific account data.
- `/payment` (POST) - This endpoint is used to update the merchant balance.
- `/withdraw` (POST) - This endpoint is used to make a transfer with the AVNU pay master to sponsored the transaction and make the off-ramp for the merchant.

## Docs

[AVNU Paymaster](https://doc.avnu.fi/starknet-paymaster/introduction)
[StarknetJS](https://www.starknetjs.com/)
[Frontend Repo](https://github.com/ArturVargas/chipi-stark)
