// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Uncomment the line to use openzeppelin/ERC721
// You can use this dependency directly because it has been installed by TA already
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract BorrowYourCar is ERC721{

    // use a event if you want
    // to represent time you can choose block.timestamp
    event CarBorrowed(uint256 carTokenId, address borrower, uint256 startTime, uint256 expireTime);
    event CancelBorrow(uint256 carTokenId, uint256 cancelTime);
    // maybe you need a struct to store car information
    struct Car {
        address borrower;
        uint256 expires; // unix timestamp, user expires
    }

    mapping(uint256 => Car) public cars; // A map from car index to its information
    // mapping(address => uint256[]) public accouts;
    // ...
    // TODO add any variables if you want
    mapping(address => bool) claimedAirdropList;

    uint256 private nextTokenId;
    uint public airdropNumber;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {
        // maybe you need a constructor
        // ERC721.tokenURI
        nextTokenId = 0;
        airdropNumber = 3;
    }

    function helloworld() pure external returns(string memory) {
        return "hello world";
    }

    /// @notice set the user and expires of an NFT
    /// @dev The zero address indicates there is no user
    /// Throws if `tokenId` is not valid 
    /// @param borrower  The new user of the NFT
    /// @param expires  UNIX timestamp, The new user could use the NFT before expires
    function setBorrow(uint256 tokenId, address borrower, uint256 expires) public virtual{
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "BorrowYourCar: none existent Token");
        require(_isAuthorized(owner, msg.sender, tokenId), "BorrowYourCar: operation caller is not owner nor approved");
        require(borrower != owner, "BorrowYourCar: can not borrow user's own car");
        require(borrowerOf(tokenId) == address(0), "BorrowYourCar: car has already been borrowed");
        require(expires > block.timestamp, "BorrowYourCar: meaningless expire time");
        Car storage car =  cars[tokenId];
        car.borrower = borrower;
        car.expires = expires;
        emit CarBorrowed(tokenId, borrower, block.timestamp, expires);
    }

    function cancelBorrow(uint256 tokenId) public virtual{
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "BorrowYourCar: none existent Token");
        require(_isAuthorized(owner, msg.sender, tokenId) || msg.sender == borrowerOf(tokenId), 
                "BorrowYourCar: operation caller is not owner, borrower nor approved");
        Car storage car =  cars[tokenId];
        car.borrower = address(0);
        car.expires = block.timestamp;
        emit CancelBorrow(tokenId, block.timestamp);
    }

    /// @notice Get the user address of an NFT
    /// @dev The zero address indicates that there is no user or the user is expired
    /// @param tokenId The NFT to get the user address for
    /// @return The user address for this NFT
    function borrowerOf(uint256 tokenId) public view virtual returns(address){
        require(_ownerOf(tokenId) != address(0), "BorrowYourCar: none existent Token");
        if( uint256(cars[tokenId].expires) >=  block.timestamp){
            return  cars[tokenId].borrower;
        }
        else{
            return address(0);
        }
    }

    /// @notice Get the user expires of an NFT
    /// @dev The zero value indicates that there is no user
    /// @param tokenId The NFT to get the user expires for
    /// @return The user expires for this NFT
    function borrowerExpires(uint256 tokenId) public view virtual returns(uint256){
        require(_ownerOf(tokenId) != address(0), "BorrowYourCar: none existent Token");
        return cars[tokenId].expires;
    }

    function airdrop() external {
        require(claimedAirdropList[msg.sender] == false, "BorrowYourCar: user has claimed airdrop already");
        for (uint i = 0; i < airdropNumber; i++) {
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
        uint256[] memory carList = getCars();
        uint256[] memory filteredList = new uint256[](carList.length);
        uint256 length = 0;
        for (uint256 i = 0; i < carList.length; i++) {
            if (borrowerOf(carList[i]) == address(0)) {
                filteredList[length] = carList[i];
                length++;
            }
        }
        uint256[] memory resultList = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            resultList[i] = filteredList[i];
        }
        return resultList;
    }

}