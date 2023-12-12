import logo from './logo.svg';
import './App.css';
import DiscordTable from './components/table/discord/discord_table.component';
import GoatTable from './components/table/goat/goat_table.component';

function App() {
  return (
    <div className="App">
      <DiscordTable />
      {/* <GoatTable /> */}
    </div>
  );
}

export default App;
