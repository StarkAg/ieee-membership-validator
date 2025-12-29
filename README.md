# IEEE Membership Validator Web App

A web application for bulk validating IEEE membership numbers and extracting membership details.

## Features

- 🔐 Secure cookie-based authentication
- 📋 Bulk validation of IEEE member numbers
- 📊 Real-time progress tracking
- 📥 CSV export of results
- 🎨 Modern, responsive UI

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Cheerio** - HTML parsing
- **Axios** - HTTP requests

## Getting Started

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Usage

1. Get your `PA.Global_Websession` cookie from your browser's Developer Tools
2. Paste the cookie into the authentication field
3. Enter IEEE member numbers (one per line, or comma/space separated)
4. Click "Validate Memberships"
5. Download results as CSV

## License

MIT
