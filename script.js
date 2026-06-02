async function loadPrices() {
  const coins = document.getElementById("coins").value;

  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${coins}` +
    `&vs_currencies=usd` +
    `&include_market_cap=true` +
    `&include_24hr_vol=true` +
    `&include_24hr_change=true` +
    `&include_last_updated_at=true`;

  const response = await fetch(url);
  const data = await response.json();

  const market = document.getElementById("market");
  market.innerHTML = "";

  for (const coin in data) {
    market.innerHTML += `
      <div class="card">
        <h2>${coin}</h2>
        <p>Price: $${data[coin].usd}</p>
        <p>Market Cap: $${data[coin].usd_market_cap}</p>
        <p>24h Volume: $${data[coin].usd_24h_vol}</p>
        <p>24h Change: ${data[coin].usd_24h_change?.toFixed(2)}%</p>
      </div>
    `;
  }
}

loadPrices();
setInterval(loadPrices, 30000);