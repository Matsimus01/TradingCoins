const searchForm = document.getElementById("searchForm");
const coinInput = document.getElementById("coinInput");
const statusMessage = document.getElementById("statusMessage");
const dashboard = document.getElementById("dashboard");
const chartSection = document.getElementById("chartSection");
const submitButton = searchForm.querySelector("button");

const coinImage = document.getElementById("coinImage");
const coinName = document.getElementById("coinName");
const coinSymbol = document.getElementById("coinSymbol");
const currentPrice = document.getElementById("currentPrice");
const marketCap = document.getElementById("marketCap");
const volume24h = document.getElementById("volume24h");
const change24h = document.getElementById("change24h");
const change7d = document.getElementById("change7d");
const trendText = document.getElementById("trendText");
const trendDetails = document.getElementById("trendDetails");

const apiBase = "https://api.coingecko.com/api/v3";
let priceChart;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2
});

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchCoin();
});

async function searchCoin() {
  const query = coinInput.value.trim();

  if (!query) {
    showError("Please type a coin name, for example bitcoin, ethereum, solana, or dogecoin.");
    return;
  }

  setLoading(true, `Loading ${query} market data...`);

  try {
    const coin = await findCoin(query);
    const [marketData, chartData] = await Promise.all([
      fetchMarketData(coin.id),
      fetchChartData(coin.id)
    ]);

    renderMarketData(marketData);
    renderChart(marketData.name, chartData.prices);
    statusMessage.textContent = `Showing live market data for ${marketData.name}.`;
    statusMessage.classList.remove("error");
    dashboard.hidden = false;
    chartSection.hidden = false;
  } catch (error) {
    dashboard.hidden = true;
    chartSection.hidden = true;
    if (priceChart) {
      priceChart.destroy();
      priceChart = null;
    }
    showError(error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

async function findCoin(query) {
  const response = await fetch(`${apiBase}/search?query=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error("CoinGecko is not responding right now. Please try again shortly.");
  }

  const data = await response.json();
  const normalizedQuery = query.toLowerCase();
  const match = data.coins.find(coin =>
    coin.id.toLowerCase() === normalizedQuery ||
    coin.name.toLowerCase() === normalizedQuery ||
    coin.symbol.toLowerCase() === normalizedQuery
  ) || data.coins[0];

  if (!match) {
    throw new Error("Coin not found. Try bitcoin, ethereum, solana, or dogecoin.");
  }

  return match;
}

async function fetchMarketData(coinId) {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false"
  });

  const response = await fetch(`${apiBase}/coins/${coinId}?${params}`);

  if (!response.ok) {
    throw new Error("Could not load market data for that coin.");
  }

  return response.json();
}

async function fetchChartData(coinId) {
  const response = await fetch(`${apiBase}/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`);

  if (!response.ok) {
    throw new Error("Could not load the seven-day price chart.");
  }

  return response.json();
}

function renderMarketData(data) {
  const market = data.market_data;
  const price = market.current_price.usd ?? 0;
  const cap = market.market_cap.usd ?? 0;
  const volume = market.total_volume.usd ?? 0;
  const dayChange = market.price_change_percentage_24h ?? 0;
  const weekChange = market.price_change_percentage_7d ?? 0;
  const trend = getTrend(weekChange);

  coinImage.src = data.image.small || "";
  coinImage.alt = `${data.name} logo`;
  coinName.textContent = data.name;
  coinSymbol.textContent = data.symbol;
  currentPrice.textContent = formatCurrency(price);
  marketCap.textContent = compactCurrencyFormatter.format(cap);
  volume24h.textContent = compactCurrencyFormatter.format(volume);
  setChangeText(change24h, dayChange);
  setChangeText(change7d, weekChange);

  trendText.textContent = trend.title;
  trendText.className = trend.className;
  trendDetails.textContent = trend.details;
}

function renderChart(name, prices) {
  if (!window.Chart) {
    throw new Error("The chart library did not load. Please refresh the page.");
  }

  const chartPoints = prices.map(point => ({
    x: new Date(point[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    y: point[1]
  }));

  const ctx = document.getElementById("priceChart");

  if (priceChart) {
    priceChart.destroy();
  }

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartPoints.map(point => point.x),
      datasets: [{
        label: `${name} price in USD`,
        data: chartPoints.map(point => point.y),
        borderColor: "#48d1cc",
        backgroundColor: "rgba(72, 209, 204, 0.14)",
        borderWidth: 3,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index"
      },
      plugins: {
        legend: {
          labels: {
            color: "#edf4ff"
          }
        },
        tooltip: {
          callbacks: {
            label: context => ` ${formatCurrency(context.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(151, 167, 188, 0.14)"
          },
          ticks: {
            color: "#97a7bc"
          }
        },
        y: {
          grid: {
            color: "rgba(151, 167, 188, 0.14)"
          },
          ticks: {
            color: "#97a7bc",
            callback: value => compactCurrencyFormatter.format(value)
          }
        }
      }
    }
  });
}

function getTrend(change) {
  if (change > 5) {
    return {
      title: "Bullish trend",
      className: "positive",
      details: "The seven-day change is above 5%, which points to recent upward momentum."
    };
  }

  if (change < -5) {
    return {
      title: "Bearish trend",
      className: "negative",
      details: "The seven-day change is below -5%, which points to recent downward momentum."
    };
  }

  return {
    title: "Neutral trend",
    className: "neutral",
    details: "The seven-day change is between -5% and 5%, so the market is moving more sideways."
  };
}

function setChangeText(element, value) {
  element.textContent = `${value.toFixed(2)}%`;
  element.className = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
}

function setLoading(isLoading, message = "") {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading" : "Search";

  if (message) {
    statusMessage.textContent = message;
    statusMessage.classList.remove("error");
  }
}

function showError(message) {
  statusMessage.textContent = message;
  statusMessage.classList.add("error");
}

function formatCurrency(value) {
  if (value < 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumSignificantDigits: 4
    }).format(value);
  }

  return currencyFormatter.format(value);
}

coinInput.value = "bitcoin";
searchCoin();
