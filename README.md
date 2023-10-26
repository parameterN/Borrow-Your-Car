# Borrow Your Car

## 作业要求：

简易汽车借用系统，参与方包括：汽车拥有者，有借用汽车需求的用户

 - 创建一个合约，在合约中发行NFT集合，每个NFT代表一辆汽车。给部分用户测试领取部分汽车NFT，用于后面的测试。
 - 在网站中，默认每个用户的汽车都可以被借用。每个用户可以： 
    1. 查看自己拥有的汽车列表。查看当前还没有被借用的汽车列表。
    2. 查询一辆汽车的主人，以及该汽车当前的借用者（如果有）。
    3. 选择并借用某辆还没有被借用的汽车一定时间。
    4. 上述过程中借用不需要进行付费。
 - （Bonus）使用自己发行的积分（ERC20）完成付费租赁汽车的流程

## 如何运行

1. 在本地启动ganache应用，创建一条私链。

2. 在 `./contracts` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```

3. 在 `./contracts` 中编译合约，运行如下的命令：
    ```bash
    npx hardhat compile
    ```

4. 配置`./contracts/hardhat.config.ts`文件，修改networks中ganache的url为本地ganache所部署的地址，并将accounts中的私钥修改为本地ganache私链中账户的私钥，然后在 `./contracts`中运行如下的命令部署合约：

    ```bash
    npx hardhat run .\scripts\deploy.ts --network ganache
    ```

5. 记录终端中显示的BorrowYourCar合约以及MyERC20合约所部署的地址，并将其拷贝到`./frontend/util/contract-addresses.json`文件中，完成前端的配置。

6. 在 `./frontend` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```

7. 在 `./frontend` 中启动前端程序，运行如下的命令：
    ```bash
    npm run start
    ```

## 功能实现分析

### 合约部分

#### 1. 发行自定义积分

​		在MyERC20.sol中，我新建了名为MyERC20的合约，使其继承自ERC20合约，这实际已经使自定义积分具有了完备的功能。在此之上，为方便代码的测试，我在MyERC20中添加了airdropToken()方法，调用ERC20中internal的_mint()方法，用于给每个新用户发放空投积分。具体代码如下：

```solidity
mapping(address => bool) claimedAirdropPlayerList;
    
function airdropToken() external {
    require(claimedAirdropPlayerList[msg.sender] == false, "MyERC20: user has claimed airdrop already");
    _mint(msg.sender, 10000);
    claimedAirdropPlayerList[msg.sender] = true;
}
```

​		之后只需要在BorrowYourCar合约中new一个MyERC20合约的对象，即可实现在部署BorrowYourCar合约的同时，也部署MyERC20自定义积分合约。

#### 2. 发行汽车NFT集合

​		和发行自定义积分类似，在BorrowYourCar.sol中，我新建了名为BorrowYourCar的合约，使其继承自ERC721合约，使其具有了完备的NFT的功能，并添加了airdrop()空投方法。为了能够记录下一个铸造的NFT的TokenId，我在合约中创建了nextTokenId的变量，并在每次铸币后使其自增，具体代码如下：

```solidity
mapping(address => bool) claimedAirdropList;
uint256 private nextTokenId; //下一个NFT的TokenId，在构造函数中初始化为0
uint256 private airdropNumber; //给每个账户空投的NFT数量

function airdrop() external {
    require(claimedAirdropList[msg.sender] == false, "BorrowYourCar: user has claimed airdrop already");
    for (uint256 i = 0; i < airdropNumber; i++) {
        _safeMint(msg.sender, nextTokenId);
        nextTokenId += 1;
    }
    claimedAirdropList[msg.sender] = true;
}
```

#### 3. 维护借车记录

​		为实现借车的功能，需要在合约中添加如下的数据结构与map。Car结构体用于记录一辆车的借用者与借用到期的时间戳，cars映射用于维护每个汽车NFT的TokenId与其借用记录的联系，具体代码如下：

```solidity
struct Car {
    address borrower;
    uint256 expires; // unix timestamp, user expires
}
mapping(uint256 => Car) public cars; // A map from car index to its information
```

​		基于这一数据结构，添加如下的方法用于查询特定TokenId的汽车的借用者与借用到期的时间戳。其中borrowerOf()方法还会比较所查询的记录中的借用到期的时间戳与当前区块的时间戳，判断借用是否已经过期，并据此返回当前借用者的address或是0地址，具体代码如下：

```solidity
function borrowerOf(uint256 tokenId) public view virtual returns(address){
    if( uint256(cars[tokenId].expires) >=  block.timestamp){
        return  cars[tokenId].borrower;
    }
    else{
        return address(0); //无借用记录或借用已到期
    }
}
function borrowerExpires(uint256 tokenId) public view virtual returns(uint256){
    return cars[tokenId].expires;
}
```

#### 4. 实现借还车功能

​		在BorrowYourCar合约中添加如下的方法，实现汽车NFT的借出功能。该方法接收一个欲借的汽车TokenId以及期望借车的小时数，方法会首先判断传入的TokenId的合法性及其当前是否还未被借出，若都满足条件，则根据每小时所需积分数coinPerHour向车主转账，然后更新Car数据结构内的借用者与借用到期时间戳的记录。具体代码如下：

```solidity
function Borrow(uint256 tokenId, uint256 hour) public virtual{
    address owner = _ownerOf(tokenId);
    require(owner != address(0), "BorrowYourCar: none existent Token");
    require(borrowerOf(tokenId) == address(0), "BorrowYourCar: car has already been borrowed");
    uint256 expires = block.timestamp + hour * 3600; 
    myERC20.transferFrom(msg.sender, owner, hour * coinPerHour);
    Car storage car =  cars[tokenId];
    car.borrower = msg.sender;
    car.expires = expires; //更新借车记录
    emit CarBorrowed(tokenId, msg.sender, block.timestamp, expires);
}
```

​		同时，也可以稍微修改该函数，实现还车的功能，还车方法仅限于指定汽车当前的借用者调用，会将汽车的借用者设置为0地址，到期时间设置为当前的时间戳，从而自然地实现了借用记录的expire。（该方法并不会退还已转账的借车积分）

```solidity
function cancelBorrow(uint256 tokenId) public virtual{
    address owner = _ownerOf(tokenId);
    require(owner != address(0), "BorrowYourCar: none existent Token");
    require(msg.sender == borrowerOf(tokenId), "BorrowYourCar: operation caller is not borrower");
    Car storage car =  cars[tokenId];
    car.borrower = address(0);
    car.expires = block.timestamp;
    emit CancelBorrow(tokenId, msg.sender, block.timestamp);
}
```

#### 5. 实现拥有汽车及未借汽车的查询

​		合约中的getCars()方法实现了对当前用户拥有汽车NFT的查询。方法首先调用balanceOf()方法，获取到当前用户账户中的NFT数量，并初始化一个长度为balance的carList数组。随后遍历每一个已经发行的NFT的TokenId`[0, nextTokenId)`，判断其owner是否为当前用户，若是，则将其加入到carList中，最后返回查询的结果。具体代码如下：

```solidity
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
```

​		合约中的getUnborrowedCars()方法实现了对当前未被借出的汽车NFT的查询，其实现方法与getCars()类似，区别在于在本方法中，判断的条件为所查询的车辆是否有不为0地址的borrower。

​		同时，由于对于当前未被借出的汽车NFT无法事先得知具体的数量，不能直接创建一个长度合适的列表，因此还需要将结果转移到一个resultList中进行返回，具体代码如下：

```solidity
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
```

### 前端部分

#### 1. 获取合约对象

​		将编译得到的BorrowYourCar合约与MyERC20合约的ABI文件拷贝到前端指定的`./frontend/src/utils/abis`目录下，并通过如下的代码获取到合约的ABI与部署地址address，使用web3所提供的方法创建合约实例，之后便能够利用合约实例实现对部署在以太坊中的合约方法的调用。具体代码如下：

```javascript
import Addresses from './contract-addresses.json'
import BorrowYourCar from './abis/BorrowYourCar.json'
import MyERC20 from './abis/MyERC20.json'
const Web3 = require('web3');

let web3 = new Web3(window.web3.currentProvider)

const BorrowYourCarAddress = Addresses.BorrowYourCar
const BorrowYourCarABI = BorrowYourCar.abi
const MyERC20Address = Addresses.MyERC20
const MyERC20ABI = MyERC20.abi

// 获取合约实例
const BorrowYourCarContract = new web3.eth.Contract(BorrowYourCarABI, BorrowYourCarAddress);
const MyERC20Contract = new web3.eth.Contract(MyERC20ABI, MyERC20Address);

// 导出web3实例和其它部署的合约
export {web3, BorrowYourCarContract, MyERC20Contract}
```

#### 2. 连接MetaMask

​		MetaMask会在window中注入ethereum对象，通过该对象即可实现与MetaMask的连接。通过ethereum对象的request方法即可向MetaMask发起请求，让用户进行授权，并获取到授权的用户的account信息，具体代码如下：

```javascript
const {ethereum} = window;
await ethereum.request({method: 'eth_requestAccounts'});
// 获取MetaMask拿到的授权用户列表
const accounts = await ethereum.request({method: 'eth_accounts'});
// 如果用户存在，获取其account
setAccount(accounts[0] || 'Not able to get accounts');
```

#### 3. 获取account数据

​		当成功获取了合约对象后，获取合约内的只读数据便十分简单了，只需要使用`Contract.method.MyMethod(params).call({from: account})`方法即可调用合约中用pure或view声明的方法。下面的代码通过react的useEffect()钩子函数，实现了每当页面加载及account发生改变时，便通过BorrowYourCarContract合约对象获取指定accout的余额等数据，并设置相应变量的值。具体代码如下：

```javascript
useEffect(() => {
    const getBorrowYourCarContractInfo = async () => {
        if (BorrowYourCarContract) {
            const cn = await BorrowYourCarContract.methods.balanceOf(account).call()
            setCarNunber(cn)
            const cl = await BorrowYourCarContract.methods.getCars().call({from: account})
            setCarList(cl)
            const ubl = await BorrowYourCarContract.methods.getUnborrowedCars().call()
            setUnborrowedList(ubl)
            const mbl = await BorrowYourCarContract.methods.getMyborrowedCars().call({from: account})
            setMyBorrowList(mbl)
        } else {
            alert('Contract not exists.')
        }
    }
    if(account !== '') {
    getBorrowYourCarContractInfo()
    }
}, [account])
```

#### 4. 前端实现借车功能

​		若要在前端JavaScript中通过合约对象调用非pure与view声明的合约方法，则需要使用`Contract.method.MyMethod(params). send({from: account})`方法, 此时send中的from参数是必须声明的，因为调用的合约方法会永久改变合约中储存变量的状态，需要支付相应的gas费用。此外，为了能够成功委托合约进行借车积分的转账，在调用合约的Borrow()方法之前，还需要先调用MyERC20合约的approve()方法，用于委托足够的积分给BorrowYourCar合约，以保证转账借车的操作能够正常进行。

​		在前端中，实现借车功能的按钮回调函数代码如下：

```javascript
    const onClickBorrow = async (carId: number, hours: number) => {
	//省略部分对传入参数的校验
        if (BorrowYourCarContract && MyERC20Contract) {
            try {
                await MyERC20Contract.methods.approve(BorrowYourCarContract.options.address,
                                                    hours * coinPerHour).send({from: account})
                await BorrowYourCarContract.methods.Borrow(carId, hours).send({from: account})
                alert('You have borrowed the cars.')
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }
```

#### 5. 其他功能

​		前端还实现了：

- 显示账户的地址、余额、所拥有的汽车NFT等信息；

- 根据汽车的carId(TokenId)来查询指定汽车NFT的owner、borrower等信息；
- 为每个carId(TokenId)的汽车分配一张不同的图片，并显示在前端中（图片数据储存在本地文件夹）；
- 点击并查看指定图片中汽车的信息；

​		这些功能将于项目运行部分展示，且与本作业的关键部分关系不大，因此不再赘述。

## 项目运行截图

#### 1. 连接钱包

​		前端启动后，点击连接钱包按钮，MetaMask弹出连接请求，选中指定的账户后，即可实现前端与钱包的连接，效果如图所示：

<img src=".\img\1.jpg" style="zoom: 45%;" />

#### 2. 领取空投

​		点击领取积分空投按钮及领取汽车空投按钮，MetaMask将弹出交易信息，给出了预计的燃料费，确认交易后，10000自定义Tokens与3个汽车NFT即可到账，效果如图所示：

<img src=".\img\2.jpg" style="zoom: 45%;" />

#### 3. 拥有车辆查询

​		在领取了积分与汽车NFT空投后，可以查看到当前用户的积分余额，并能在“拥有车辆”栏查看到当前用户所拥有的所有车辆，效果如图所示：

​		<img src=".\img\3.jpg" style="zoom: 45%;" />

#### 4. 车辆信息查询

​		点击下方列表中的任意汽车图片，或是在查询栏中输入要查询的carId(TokenId)后点击查询按钮，即可显示选中汽车的信息，包括指定汽车NFT的carId、owner、borrower(若无则显示0地址)以及借用的到期时间，效果如图所示：		

<img src=".\img\4.jpg" style="zoom: 45%;" />

#### 5. 未借车辆查询

​		在“未借车辆”栏中能够查看到当前所有还未被借出的汽车NFT的列表（包含借用已到期的汽车），效果如图所示：

​		<img src=".\img\5.jpg" style="zoom: 45%;" />

#### 6. 借车功能

​		在“未借车辆”的视图中，选中想要借用的汽车，并在输入框内填入想要借用的时长24小时，随后点击借车按钮，根据借车时间，MetaMask会首先提示用户approve给BorrowYourCar合约一定数量的积分用于完成租金转账的操作，效果如图所示：

<img src=".\img\6.jpg" style="zoom: 45%;" />

​		随后MetaMask会提示用户调用BorrowYourCar合约的Borrow方法，以实现租金的转账以及借车信息的设置，效果如图所示：

<img src=".\img\7.jpg" style="zoom: 45%;" />

​		操作完成后，能够在“已借车辆”栏看到当前用户已经借用的车辆，且积分余额被正确扣除了相应的租金24积分。点击刚才借用的cardId为1的车辆，查看其详细信息，发现Borrower已被成功设置为了当前用户的地址，且借用到期时间为24小时之后，符合预期，效果如图所示：

<img src=".\img\8.jpg" style="zoom: 45%;" />

#### 7. 还车功能

​		在“已借车辆”栏中，可以选中一辆当前借用的汽车，然后点击还车按钮归还车辆，点击归还按钮后，MetaMask将弹出提示用户确认交易的窗口，确认后会将汽车的借用到期时间直接设置为当前区块的时间戳，使其立刻过期（该操作并不会退还已经支付的租金），效果如图所示：

<img src=".\img\9.jpg" style="zoom: 45%;" />

## 参考内容

- 课程的参考Demo：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)

- ERC-4907：[参考实现](https://eips.ethereum.org/EIPS/eip-4907)

- solidity中文文档：[solidity](https://learnblockchain.cn/docs/solidity/)

- web3官方网站：[web3 api](https://docs.web3js.org/api)
