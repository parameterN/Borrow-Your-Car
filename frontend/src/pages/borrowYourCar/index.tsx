import {Button, Image} from 'antd';
import {Header} from "../../asset";
import {useEffect, useState} from 'react';
import {BorrowYourCarContract, MyERC20Contract, web3} from "../../utils/contracts";
import moment from 'moment';
import './index.css';

const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)
// TODO change according to your configuration
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

const BorrowYourCarPage = () => {

    const [account, setAccount] = useState('')
    const [balance, setBalance] = useState(0)
    const [carNumber, setCarNunber] = useState(0)
    const [coinPerHour, setCoinPerHour] = useState(0)
    const [owner, setOwner] = useState('')
    const [borrower, setBorrower] = useState('')
    const [expire, setExpire] = useState('')
    const [chosen, setChosen] = useState(-1)
    const [searchCar, setSearchCar] = useState(0)
    const [borrowHour, setBorrowHour] = useState(0)
    const [carList, setCarList] = useState([])
    const [myBorrowList, setMyBorrowList] = useState([])
    const [unborrowedList, setUnborrowedList] = useState([])
    const [activeTab, setActiveTab] = useState(0);


    useEffect(() => {
        // 初始化检查用户是否已经连接钱包
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        const initCheckAccounts = async () => {
            // @ts-ignore
            const {ethereum} = window;
            if (Boolean(ethereum && ethereum.isMetaMask)) {
                // 尝试获取连接的用户账户
                const accounts = await web3.eth.getAccounts()
                if(accounts && accounts.length) {
                    setAccount(accounts[0])
                }
            }
        }
        initCheckAccounts()
    }, [])

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
                const cph = await BorrowYourCarContract.methods.coinPerHour().call()
                setCoinPerHour(cph)
            } else {
                alert('Contract not exists.')
            }
        }
        if(account !== '') {
        getBorrowYourCarContractInfo()
        }
    }, [account])

    useEffect(() => {
        const getAccountInfo = async () => {
            if (MyERC20Contract) {
                const ba = await MyERC20Contract.methods.balanceOf(account).call()
                setBalance(ba)
            } else {
                alert('Contract not exists.')
            }
        }

        if(account !== '') {
            getAccountInfo()
        }
    }, [account])

    const onClaimTokenAirdrop = async () => {
        if(account === '') {
            alert('You have not connected wallet yet.')
            return
        }

        if (MyERC20Contract) {
            try {
                await MyERC20Contract.methods.airdropToken().send({from: account})

                alert('You have claimed ZJU Token.')
            } catch (error: any) {
                alert(error.message)
            }

        } else {
            alert('Contract not exists.')
        }
    }

    const onClaimCarAirdrop = async () => {
        if(account === '') {
            alert('You have not connected wallet yet.')
            return
        }

        if (BorrowYourCarContract) {
            try {
                await BorrowYourCarContract.methods.airdrop().send({from: account})
                alert('You have claimed the cars.')
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }

    const onClickBorrow = async (carId: number, hours: number) => {
        if(account === '') {
            alert('You have not connected wallet yet.')
            return
        }

        if(chosen === -1) {
            alert('Please choose a car first.')
            return
        }

        if(borrowHour <= 0) {
            alert('Please input a valid time to borrow.')
            return
        }

        if(unborrowedList.find((e)=>{return e === carId}) === undefined) {
            alert('Please select a valid carId.')
            return
        }

        if (BorrowYourCarContract && MyERC20Contract) {
            try {
                await MyERC20Contract.methods.approve(BorrowYourCarContract.options.address, hours * coinPerHour).send({from: account})
                await BorrowYourCarContract.methods.Borrow(carId, hours).send({from: account})
                alert('You have borrowed the cars.')
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }

    const onClickReturn = async (carId: number) => {
        if(account === '') {
            alert('You have not connected wallet yet.')
            return
        }

        if(chosen === -1) {
            alert('Please choose a borrowed car first.')
            return
        }

        if (BorrowYourCarContract) {
            try {
                await BorrowYourCarContract.methods.cancelBorrow(carId).send({from: account})
                alert('Successfully returned.')
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }

    const onClickImage = async (carId: number) => {
        if(carId === -1) {
            alert('Please input a valid carId.')
            return
        }

        if (BorrowYourCarContract) {
            try {
                const on = await BorrowYourCarContract.methods.ownerOf(carId).call()
                setOwner(on)
                const bo = await BorrowYourCarContract.methods.borrowerOf(carId).call()
                setBorrower(bo)
                const ex = await BorrowYourCarContract.methods.borrowerExpires(carId).call()
                setExpire(ex)
                setChosen(carId)
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('Contract not exists.')
        }
    }

    const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        // @ts-ignore
        const {ethereum} = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            alert('MetaMask is not installed!');
            return
        }

        try {
            // 如果当前小狐狸不在本地链上，切换Metamask到本地测试链
            if (ethereum.chainId !== GanacheTestChainId) {
                const chain = {
                    chainId: GanacheTestChainId, // Chain-ID
                    chainName: GanacheTestChainName, // Chain-Name
                    rpcUrls: [GanacheTestChainRpcUrl], // RPC-URL
                };

                try {
                    // 尝试切换到本地网络
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到Metamask中，添加该网络
                    if (switchError.code === 4902) {
                        await ethereum.request({ method: 'wallet_addEthereumChain', params: [chain]
                        });
                    }
                }
            }

            // 小狐狸成功切换网络了，接下来让小狐狸请求用户的授权
            await ethereum.request({method: 'eth_requestAccounts'});
            // 获取小狐狸拿到的授权用户列表
            const accounts = await ethereum.request({method: 'eth_accounts'});
            // 如果用户存在，展示其account，否则显示错误信息
            setAccount(accounts[0] || 'Not able to get accounts');
        } catch (error: any) {
            alert(error.message)
        }
    }

    const Tabs = () => {      
        const handleTabClick = (index: number) => {
          setActiveTab(index);
          setChosen(-1);
          setOwner('');
        };
        return (
          <div>
            <div className="tab-buttons" style={{margin: "10px"}}>
              <Button style={activeTab === 0 ? {outline: "4px solid blue"} : {}} onClick={() => handleTabClick(0)}>拥有车辆</Button>
              <Button style={activeTab === 1 ? {outline: "4px solid blue", marginLeft: "20px"} : {marginLeft: "20px"}} onClick={() => handleTabClick(1)}>已借车辆</Button>
              <Button style={activeTab === 2 ? {outline: "4px solid blue", marginLeft: "20px"} : {marginLeft: "20px"}} onClick={() => handleTabClick(2)}>未借车辆</Button>
            </div>
            
            {activeTab === 0 && <div>拥有的汽车列表<ImageGrid list={carList}/></div>}
            {activeTab === 1 && <div>已借的汽车<ImageGrid list={myBorrowList}/></div>}
            {activeTab === 2 && <div>未借出的汽车列表<ImageGrid list={unborrowedList}/></div>}
          </div>
        );
      };

    const ImageGrid = (props: {list: never[]}) => {   
      if(props.list.length === 0)
        return (<div className="image-grid" style={{paddingLeft: "40%"}}>无</div>)
      else
        return (
            <div className="image-grid">
            {props.list.map((id) => {
                return (
                <div key={id} className="image-item">
                    <img src={require(`../../asset/${id}.jpg`)}  alt=''
                    onClick={()=>onClickImage(id)} style={id === chosen ? {outline: "4px solid red"} : {}}/>
                    <div>carId: {id}</div>
                </div>
                );
            })}
            </div>
        );
    };
      
    return (
        <div className='container'>
            <Image
                width='100%'
                height='300px'
                preview={false}
                src={Header}
            />
            <div className='main'>
                <h1>Borrow Your Car </h1>
                <Button onClick={onClaimTokenAirdrop}>领取积分空投</Button>
                <Button style={{marginLeft: "20px"}} onClick={onClaimCarAirdrop}>领取汽车空投</Button>
                <div>{account === '' && <Button style={{marginTop: "10px"}} onClick={onClickConnectWallet}>连接钱包</Button>}</div>    
                <div className='account' style={{margin: "10px", textAlign:"left", marginLeft: "35%"}}>
                    <li>当前用户：{account === '' ? '无用户连接' : account}</li>
                    <li>当前用户拥有积分数量：{balance} Tokens</li>
                    <li>当前用户拥有汽车数量：{carNumber}</li>
                    <li>当前用户拥有汽车列表：{carList.toString()}</li>
                </div>
                    按CarId查询汽车：
                    <input type='number' value={searchCar} onChange={(e)=>setSearchCar(e.target.valueAsNumber)}></input>
                    <Button style={{marginLeft: "10px"}} onClick={()=>onClickImage(searchCar)}>查询</Button>
                <div className='select' style={{margin: "10px", textAlign:"left", marginLeft: "35%"}}>
                    {owner !== '' && <div style={{fontWeight: "bold"}}>选中汽车信息：</div>}
                    {owner !== '' && <li>CarId: {chosen}</li>}
                    {owner !== '' && <li> Owner: {owner}</li>}
                    {owner !== '' && <li>Expire Time: {expire}({expire === '0' ? '无借出记录' : moment(Number(expire) * 1000).format('YYYY-MM-DD HH:mm:ss')})</li>}
                    {owner !== '' && <li> Borrower: {borrower}</li>}
                </div>
                    <Tabs/>
                    {activeTab === 1 && <div className='buttons'>
                        <Button style={{width: '200px'}} onClick={()=>onClickReturn(chosen)}>还车</Button></div>}
                    {activeTab === 2 && <div className='buttons' style={{display: 'inline-block'}}>
                        <Button style={{width: '200px', marginRight: "10px"}} onClick={()=>onClickBorrow(chosen, borrowHour)}>借车</Button>
                        借车时间（{coinPerHour} Tokens/小时）:
                        <input type='number' style={{margin: "0 10px"}} value={borrowHour} onChange={(e)=>setBorrowHour(e.target.valueAsNumber)}></input></div>}
                        小时
            </div>
        </div>
    )
}

export default BorrowYourCarPage