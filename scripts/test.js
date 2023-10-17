// Useful Stuff
// npx hardhat run --network hardhat scripts/test.js
// https://github.com/NazaWEb/ultimate-smart-contracts/blob/main/Web3BuildersERC721.sol from another good tutorial
// https://docs.openzeppelin.com/contracts/4.x/wizard  generate base token contracts
// https://www.youtube.com/watch?v=LHZC9wX3r0I  Royalties
// https://github.com/rarible/protocol-contracts/tree/master/royalties/contracts base contracts from rarible

const hre = require("hardhat");
const ethers = hre.ethers
const { BigNumber } = ethers
const decoderThing = require('ethereum-input-data-decoder')

const provider = new ethers.providers.Web3Provider(hre.network.provider)

const cids1 = require('../../../contract/assets/metadata/cids1.json')


const { decimals, file } = require('../utils')

const { d, displayToWei } = decimals

const run = async () => {
  try {

    const network = process.env.HARDHAT_NETWORK;
    if (typeof (network) === 'undefined') {
      console.log("This requires network set to hardhat. Try: npx hardhat run --network hardhat filepath");
      process.exit(1);
    }
    if (network !== 'hardhat') {
      console.log("Unsupported Network For testing");
      process.exit(1);
    }

    const [owner, controller, minter, recipient] = await ethers.getSigners()
    console.log(owner.address)
    const balance = await ethers.provider.getBalance(owner.address)
    console.log('Owner Balance: ' + d(balance, 18)) + ' ETH'

    const Contract = await hre.ethers.getContractFactory("AiCoco")
    const baseUri = process.env.BASE_URI
    const contractUri = process.env.BASE_URI + process.env.CONTRACT_CID
    const pricePerToken = ethers.BigNumber.from('250000000000000000000000000000') // 500 Billion
    
    const [aTokenContract, aTokenAddress] = await deployAtoken() // deploy AToken contract to hardhat

    const contract = await Contract.deploy(
      baseUri,
      contractUri,
      process.env.ROYALTY_PERC,
      controller.address,
      pricePerToken,
      aTokenAddress
    );
    await contract.deployed()

    contractAddress = contract.address
    console.log("AiCoco contract deployed to:", contractAddress)

    await contract.connect(controller).setCids(cids1) // set setCids for the first 5 tokens
    // await contract.connect(controller).setCids(cids2) //tokens 5 through 10
    console.log('Cid1 was set.')
    console.log()

    await contract.connect(controller).setMinting(true)
    async function tokenUris(uris) {
      for (let i = 0; i < uris.length; i++) {
        try {
          console.log('Token URI: ' + uris[i] + ' ' + await contract.tokenURI(uris[i]))
        } catch (error) {
          console.log('Couldnt determine token URI from number: ' + uris[i] + ', error')
        }
      }
    }

    // Single Mint

    // To mint a single first you must get the cost of the minting, then approve the contract to spend that amount
    // then you can call the contract to mint.

    console.log('Testing Single Mints...')
    console.log('  Next token to be minted: ' + (await contract.tokenCounter()))
    const price = await contract.pricePerNft()
    console.log('  Price, in decimal form: ' + d(price.toString(), 18))
    await aTokenContract.connect(owner).transfer(minter.address, price) // send tokens from the owner address to allow minter to work
    await aTokenContract.connect(minter).approve(contractAddress, price) // approve the contract to burn tokens
    await contract.connect(minter).publicMint()
    console.log('  Wallet of owner: ' + await contract.walletOfOwner(minter.address))

    await tokenUris([1])

    console.log()

    console.log('Testing Multiple Mints...')
    console.log('  Next token to be minted: ' + (await contract.tokenCounter()))
    const multiPrice = price.mul(ethers.BigNumber.from('3'))
    console.log('  Price for three, in decimal form: ' + d(multiPrice.toString(), 18))
    await aTokenContract.connect(owner).transfer(minter.address, multiPrice) // send tokens from the owner address to allow minter to work
    await aTokenContract.connect(minter).approve(contractAddress, multiPrice) // approve the contract to burn tokens
    await contract.connect(minter).publicMintMulti(ethers.BigNumber.from('3')) // do the thing

    console.log('  Next token to be minted: ' + (await contract.tokenCounter()))
    const wallet = await contract.walletOfOwner(minter.address)
    console.log('  Wallet of owner: ' + wallet)

    await tokenUris(wallet)

    console.log()

    await displayRoyalties(contract, 1)
    await pauserTests(contract, 1)

  } catch (error) {
    console.log(error)
  }
  process.exit()
}

const pauserTests = async (contract, _tokenId) => {
  const [owner, controller, minter, recipient] = await ethers.getSigners()
  const tokenId = ethers.BigNumber.from(_tokenId)
  // default not paused
  let isPaused = await contract.itemIsPaused(tokenId)
  if (isPaused === true) console.log('Error: Item is paused and shouldnt be.')
  await contract.connect(controller).pauseItem(tokenId)
  try {
    await contract.connect(minter).transferFrom(minter.address, recipient.address, tokenId)
    console.log('Error: transfer succeeded when paused.')
  } catch (error) {}
  await contract.connect(controller).resumeItem(tokenId)
  try {
    await contract.connect(minter).transferFrom(minter.address, recipient.address, tokenId)
    const wallet = await contract.walletOfOwner(recipient.address)
    if (wallet.length > 0) console.log('Pause single tests passed\n')
    else {
      console.log('Recipients Assets:  ', wallet)
    }
  } catch (error) {
    console.log('Error: Unable to transfer an unpaused item')
  }
}

const displayRoyalties = async (contract, tokenId) => {
  const supportsRarible = await contract.supportsInterface('0xcad96cca')
  if (!supportsRarible) {
    console.log('ERROR: this contract doesnt support rarible.')
  }
  const rarible = await contract.getRaribleV2Royalties(1)
  console.log('Royalties:')
  console.log('  Rarible: ' + tokenId + ': ' + rarible[0].value + ' basis points') 
  const openSea = await contract.royaltyInfo(1, 12345678)
  console.log('  OpenSea: ' + openSea.royaltyAmount + ' ...uses an arbitrary trade value') // pretty sure this is for openSea
  console.log()
}

const deployAtoken = async () => {
  const parameters = [
    ethers.BigNumber.from('420690000000000000000000000000000')
  ]
  const Contract = await hre.ethers.getContractFactory("AToken")
  const aTokenContract = await Contract.deploy(...parameters)
  await aTokenContract.deployed()
  aTokenAddress = aTokenContract.address
  console.log("AToken contract deployed to: " + aTokenAddress + ' on hardhat')
  return [aTokenContract, aTokenAddress]
}

  ; (async () => {
    await run()
  })()