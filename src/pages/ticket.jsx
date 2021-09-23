import React, {useEffect} from 'react';
import { Page, Navbar, Block, BlockTitle } from 'framework7-react';
import postscribe from 'postscribe';

const TicketPage = () => {
  useEffect(() => {
    postscribe('#ticket', `<script
    src="https://www.universe.com/embed2.js"
    data-widget-type="universe-ticket"
    data-target-type="Listing"
    data-target-id="trevarefest-2022-tickets-JVH5BS"
    data-state="buttonColor=#3A66E5&buttonText=Get Tickets" >
  </script>`);
  },[])
  return (
    <Page>
      {/* <Navbar title="Ticket"/> */}
      <div id="ticket"></div>
    </Page>
  );
}
export default TicketPage;
