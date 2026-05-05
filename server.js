import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '1mb' }));

const BASE_URL = 'https://www.trip.com/ai-resource';
const PORT = process.env.PORT || 8080;

async function postTrip(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'tripcom-remote-mcp/1.0'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Trip.com ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) out[key] = obj[key];
  }
  return out;
}

function firstArray(obj, keys) {
  for (const key of keys) {
    if (Array.isArray(obj?.[key])) return obj[key];
  }
  return [];
}

function preview(kind, raw) {
  const map = {
    hotels: ['hotelList', 'hotels', 'data', 'result'],
    flights: ['flightList', 'flights', 'data', 'result'],
    cars: ['carList', 'cars', 'data', 'result'],
    activities: ['activityList', 'activities', 'productList', 'data', 'result']
  };
  const arr = firstArray(raw, map[kind] || []);
  const fields = {
    hotels: ['hotelId', 'id', 'hotelName', 'name', 'star', 'starRating', 'rating', 'reviewScore', 'price', 'minPrice', 'currency', 'address', 'cityName'],
    flights: ['flightNo', 'airlineName', 'airlineCode', 'originCityCode', 'destinationCityCode', 'departureTime', 'arrivalTime', 'price', 'currency', 'cabinClass', 'stops'],
    cars: ['carId', 'carName', 'brand', 'vendorName', 'price', 'currency', 'location', 'cityName'],
    activities: ['productId', 'id', 'title', 'name', 'category', 'price', 'currency', 'rating', 'destination']
  };
  return arr.slice(0, 10).map(item => pick(item, fields[kind] || []));
}

function createServer() {
  const server = new McpServer({ name: 'tripcom-remote', version: '1.0.0' });

  server.tool('search_hotels', {
    cityName: z.string(),
    locale: z.string().default('en-US'),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    topHotel: z.number().int().positive().optional(),
    starList: z.array(z.number().int()).optional(),
    facilityList: z.array(z.number().int()).optional(),
    themeList: z.array(z.number().int()).optional(),
    typeList: z.array(z.number().int()).optional(),
    originalInput: z.string(),
    originalInputInEnglish: z.string()
  }, async (args) => {
    const raw = await postTrip('/searchHotel', args);
    return { content: [{ type: 'text', text: JSON.stringify({ kind: 'hotels', request: args, preview: preview('hotels', raw), raw }, null, 2) }] };
  });

  server.tool('search_flights', {
    originCityCode: z.string().optional(),
    destinationCityCode: z.string(),
    departureDate: z.string().optional(),
    returnDate: z.string().optional(),
    locale: z.string().default('en-US'),
    oneWayOrRoundTrip: z.enum(['OW', 'RT']).optional(),
    originalInput: z.string(),
    originalInputInEnglish: z.string()
  }, async (args) => {
    const raw = await postTrip('/searchFlightTicket', args);
    return { content: [{ type: 'text', text: JSON.stringify({ kind: 'flights', request: args, preview: preview('flights', raw), raw }, null, 2) }] };
  });

  server.tool('search_cars', {
    originCountryCode: z.string(),
    destinationCityName: z.string(),
    locale: z.string().default('en-US'),
    originalInput: z.string(),
    originalInputInEnglish: z.string()
  }, async (args) => {
    const raw = await postTrip('/searchCars', args);
    return { content: [{ type: 'text', text: JSON.stringify({ kind: 'cars', request: args, preview: preview('cars', raw), raw }, null, 2) }] };
  });

  server.tool('search_activities', {
    locale: z.string().default('en-US'),
    destination: z.string().optional(),
    pointOfInterest: z.string().optional(),
    beginDate: z.string().optional(),
    endDate: z.string().optional(),
    categories: z.array(z.enum(['All', 'Attractions', 'TravelServices', 'Experiences', 'Tours', 'WiFi&PhoneCards'])).optional(),
    sort: z.enum(['Recommended', 'TravelerRating', 'SalesVolume']).optional(),
    limit: z.number().int().positive().optional(),
    originalInput: z.string(),
    originalInputInEnglish: z.string()
  }, async (args) => {
    const raw = await postTrip('/searchAttractionAndActivity', args);
    return { content: [{ type: 'text', text: JSON.stringify({ kind: 'activities', request: args, preview: preview('activities', raw), raw }, null, 2) }] };
  });

  server.tool('test_tripcom_connection', {
    cityName: z.string().default('Singapore'),
    locale: z.string().default('en-US')
  }, async ({ cityName, locale }) => {
    const request = {
      cityName,
      locale,
      originalInput: `Find hotels in ${cityName}`,
      originalInputInEnglish: `Find hotels in ${cityName}`
    };
    const raw = await postTrip('/searchHotel', request);
    return { content: [{ type: 'text', text: JSON.stringify({ kind: 'hotels', request, preview: preview('hotels', raw), raw }, null, 2) }] };
  });

  return server;
}

app.get('/', (_req, res) => {
  res.json({
    name: 'tripcom-remote-mcp',
    status: 'ok',
    mcp_endpoint: '/mcp'
  });
});

app.all('/mcp', async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on('close', () => transport.close());

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(`Trip.com remote MCP listening on port ${PORT}`);
});
