// SPDX-License-Identifier: UNLICENSED
pragma solidity  ^0.8.20;

// Uncomment the line to use openzeppelin/ERC721
// You can use this dependency directly because it has been installed by TA already
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./MyERC20.sol";
// Uncomment this line to use console.log
import "hardhat/console.sol";

contract BorrowYourCar is ERC721{

    // to represent time you can choose block.timestamp
    event CarBorrowed(uint256 carTokenId, address borrower, uint256 startTime, uint256 expireTime);
    event CancelBorrow(uint256 carTokenId, address borrower, uint256 cancelTime);
    // maybe you need a struct to store car information
    struct Car {
        address borrower;
        uint256 expires; // unix timestamp, user expires
    }

    mapping(uint256 => Car) public cars; // A map from car index to its information
    mapping(address => bool) claimedAirdropList;

    uint256 private nextTokenId;
    uint256 public airdropNumber;
    uint256 public coinPerHour;
    MyERC20 public myERC20; // 彩票相关的代币合约

    constructor() ERC721("BorrowYourCar", "cars") {
        // ERC721.tokenURI
        nextTokenId = 0;
        airdropNumber = 3;
        coinPerHour = 1;
        myERC20 = new MyERC20();
    }

    function helloworld() pure external returns(string memory) {
        return "hello world";
    }

    function Borrow(uint256 tokenId, uint256 hour) public virtual{
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "BorrowYourCar: none existent Token");
        // require(_isAuthorized(owner, msg.sender, tokenId), "BorrowYourCar: operation caller is not owner nor approved");
        require(borrowerOf(tokenId) == address(0), "BorrowYourCar: car has already been borrowed");
        uint256 expires = block.timestamp + hour * 3600; 
        myERC20.transferFrom(msg.sender, owner, hour * coinPerHour);
        Car storage car =  cars[tokenId];
        car.borrower = msg.sender;
        car.expires = expires;
        emit CarBorrowed(tokenId, msg.sender, block.timestamp, expires);
    }

    function cancelBorrow(uint256 tokenId) public virtual{
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "BorrowYourCar: none existent Token");
        // require(_isAuthorized(owner, msg.sender, tokenId) || msg.sender == borrowerOf(tokenId), 
        //         "BorrowYourCar: operation caller is not owner, borrower nor approved");
        require(msg.sender == borrowerOf(tokenId), "BorrowYourCar: operation caller is not borrower");
        Car storage car =  cars[tokenId];
        car.borrower = address(0);
        car.expires = block.timestamp;
        emit CancelBorrow(tokenId, msg.sender, block.timestamp);
    }

    function borrowerOf(uint256 tokenId) public view virtual returns(address){
        if( uint256(cars[tokenId].expires) >=  block.timestamp){
            return  cars[tokenId].borrower;
        }
        else{
            return address(0);
        }
    }

    function borrowerExpires(uint256 tokenId) public view virtual returns(uint256){
        return cars[tokenId].expires;
    }

    function airdrop() external {
        require(claimedAirdropList[msg.sender] == false, "BorrowYourCar: user has claimed airdrop already");
        for (uint256 i = 0; i < airdropNumber; i++) {
            _safeMint(msg.sender, nextTokenId);
            nextTokenId += 1;
        }
        claimedAirdropList[msg.sender] = true;
    }

    function getCars() public view returns(uint256[] memory) {
        uint256 balance = balanceOf(msg.sender);
        uint256[] memory carList = new uint256[](balance);
        if(balance == 0) return carList;
        uint256 index = 0;
        for(uint256 tokenId = 0; tokenId < nextTokenId; tokenId++) {
            if(_ownerOf(tokenId) == msg.sender) {
                carList[index] = tokenId;
                index += 1;
                if(index == balance) break;
            }
        }
        return carList;
    }

    function getUnborrowedCars() external view returns(uint256[] memory) {
        uint256[] memory carList = new uint256[](nextTokenId);
        uint256 length = 0;
        for (uint256 i = 0; i < nextTokenId; i++) {
            if (borrowerOf(i) == address(0)) {
                carList[length] = i;
                length++;
            }
        }
        uint256[] memory resultList = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            resultList[i] = carList[i];
        }
        return resultList;
    }

    function getMyborrowedCars() external view returns(uint256[] memory) {
        uint256[] memory carList = new uint256[](nextTokenId);
        uint256 length = 0;
        for (uint256 i = 0; i < nextTokenId; i++) {
            if (borrowerOf(i) == msg.sender) {
                carList[length] = i;
                length++;
            }
        }
        uint256[] memory resultList = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            resultList[i] = carList[i];
        }
        return resultList;
    }

}