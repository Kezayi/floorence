 import TransactionsTable from '@/components/admin/TransactionsTable';
 
 const Transactions = () => {
   return (
     <div>
       <h1 className="text-3xl font-bold text-foreground mb-8">Transactions</h1>
       <TransactionsTable />
     </div>
   );
 };
 
 export default Transactions;