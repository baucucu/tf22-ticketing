import React, {useEffect, useState} from 'react';
import { Page, Navbar, Block, BlockTitle, List, ListItem,ListInput,Button, Icon, Searchbar } from 'framework7-react'; 
import * as Realm from "realm-web";
import CodeGenerator from 'node-code-generator';






export default function HomePage({f7route, f7router}){

  const REALM_APP_ID = "tf22-ukjct"; // e.g. myapp-abcde
  const app = new Realm.App({ id: REALM_APP_ID });

  const [shop,setShop] = useState()
  const [user, setUser] = useState(app.currentUser)
  const [tickets, setTickets] = useState([])
  const [newCode,setNewCode] = useState()
  const [error, setError] = useState("")

  const loginAnonymous = async () => {
    const user = await app.logIn(Realm.Credentials.anonymous());
    setUser(user);
  };

  const generateTicketCode = async () => {
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const ticketCodes = mongodb.db("TF22").collection("TicketCodes");
    
    var generator = new CodeGenerator();
    var pattern = '###***';
    var howMany = 1;
    var options = {
      sparcity: 5,
      existingCodesLoader: tickets.map(ticket => ticket.code)
    };

    // Generate an array of random unique codes according to the provided pattern:
    var code = generator.generateCodes(pattern, howMany, options);
    console.log("code: ",code)
    setNewCode(code[0])

    const result = await ticketCodes.insertOne({      
      createdAt: new Date(),
      code: code[0],
      shopId: shop.shopId,
      used: false
    })
  }

  const getShopTickets = async (shopId) => {  
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const ticketCodes = mongodb.db("TF22").collection("TicketCodes");

     const res = await ticketCodes.find({shopId: shopId})
     console.log(`tickets lookup for ${shopId}: `, res)
     return res
  }

  const getShop = async (shopId) => {
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const shops = mongodb.db("TF22").collection("Shops");
    const res = await shops.findOne({shopId: shopId})
    console.log(`shops lookup for ${shopId}: `, res)
    return res
  }

  useEffect(() => {loginAnonymous()},[])

  useEffect(() => {
      console.log("route: ", f7route.query.shop);
      if(f7route.query?.shop) {
        getShop(f7route.query?.shop).then(res => {
          console.log("db shop: ", res)
          if(res === null) {setError("Invalid shop")}
          else if(res?.shopId){ 
            setShop(res)
          }
        })
        
      }
  },[])

  const watchTickets = async () => {
    const mongodb = app.currentUser.mongoClient("mongodb-atlas");
    const ticketCodes = mongodb.db("TF22").collection("TicketCodes");
    for await (const change of ticketCodes.watch()) {
      console.log("tickets db change: ", change)
      getShopTickets(f7route.query?.shop).then(res => setTickets([...res]))
    }
  }

  useEffect(() => {
    watchTickets();
  },[shop])

  useEffect(() => {
    console.log("tickets have changed: ", tickets)
  }, [tickets])

  useEffect(() => {
    console.log("shop has changed: ", shop)
  },[shop])

  useEffect(() => {
    getShopTickets(f7route.query?.shop).then(res => setTickets([...res]))
  },[shop,user,newCode])

  return (
    <Page>
      {shop && <Navbar title={"TF22 - " + shop.shopName} />}
      {/* <BlockTitle>{user?.id}</BlockTitle> */}
      {error && <Block>{error}</Block>}
      {shop && <Shop tickets={tickets} generateTicketCode={generateTicketCode} newCode={newCode}/>}
      {!shop && !error && <Client f7router={f7router} app={app}/>}
    </Page>
  );
}

const Shop = ({tickets, generateTicketCode, newCode}) => {
  return (
    <> 
      <TicketCodeGenerator generateTicketCode={generateTicketCode} newCode={newCode}/>
      <TicketsList tickets={tickets}/>

    </>
  )
}

const TicketsList = ({tickets}) => {

  // useEffect(() => {
  //   console.log("tickets: ",tickets)
  // },[tickets])
  
  return (
    <>
      <Searchbar
        searchContainer="#tickets-list"
        searchIn=".item-title"
      ></Searchbar>
      <List id="tickets-list">
        { tickets.sort((a,b)  => b.createdAt - a.createdAt).map((ticket, id) => {return(<ListItem key={id} title={ticket?.code} after={ticket?.used ? "Used": "Valid"} ><Icon slot="media" color={ticket?.used ? "yellow" : "green"} f7={ticket?.used ? "exclamationmark_circle_fill" : "checkmark_alt_circle_fill" }></Icon></ListItem>)}) }
      </List>
    </>
  )
}

const TicketCodeGenerator = ({generateTicketCode, newCode}) => {
  useEffect(() => {
    console.log("new code generated: ", newCode);
  }, [newCode])
  return(
    <Block>
      <Button raised fill onClick={generateTicketCode}>Generate new ticket</Button>
      {newCode && <Block strong inset>
        <h1>
          New code: {newCode}
        </h1>
      </Block>}
    </Block>
  )
}

const Client = ({f7router, app}) => {

  const [code, setCode] = useState("");
  const [enableSubmit, setEnableSubmit] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [error, setError] = useState()

  const validateCode = async (code) => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(async () => {
      const mongodb = app.currentUser.mongoClient("mongodb-atlas");
      const ticketCodes = mongodb.db("TF22").collection("TicketCodes");
      const dbCode = await ticketCodes.findOne({code: code})
      
      console.log("db code lookup: ", dbCode)
      if (dbCode === null) {
        setError("Invalid code")
      } else if(dbCode && dbCode.used) {
        setError("Code already used")
      } else if (dbCode && !dbCode.used) {
        setIsCodeValid(true); 
        const newDbCode = dbCode
        newDbCode.used = true;
        newDbCode.usedAt = new Date()
        ticketCodes.updateOne(
          {code: code},
          { $set: { used: true, usedAt: new Date()} }
        )
        f7router.navigate("/ticket/");
        
      }
      setIsLoading(false);
    }, 2000);
    
  };


  useEffect(()=>{
    if (code.length === 6){setEnableSubmit(true)} else {setEnableSubmit(false)}
  },[code])

  const onSubmit = (e) => {
    console.log("event: ",e)
    validateCode(e)
  }

  return (
    <Block>
      <List noHairlinesMd>
        <ListInput
          label="Code"
          floatingLabel
          type="text"
          placeholder="Enter code"
          // value={code}
          clearButton
          onInput={(event) => {setCode(event.target.value)}}
        >
          {/* <Icon icon="demo-list-icon" slot="media"/> */}
        </ListInput>
      </ List>
      <Button raised fill preloader type="submit" loading={isLoading}  disabled={!enableSubmit || isCodeValid} onClick={() => {onSubmit(code)}}>
        {isCodeValid && "Code is valid"}
        {isCodeValid || "Submit"}
      </Button>
      {error && <Block>{error}</Block>}
    </Block>
  )
}