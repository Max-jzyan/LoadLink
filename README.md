<h1>
  <img src="frontend/public/favicon.svg" width="36" color="#1c9cf0" valign="middle"/>
  &nbsp; Load Link
</h1>

**By Team #5: The Fantastic Five**
## Meet the Team
Alexandar Lackovic (74213307) <br>
Wendy Tso (34159368) <br>
Max Yan (86293560) <br>
Kyle Jones (82804451) <br>
Eojin Lee (25508730) 

## Project Description
Truck driving management system designed to streamline the logistics of cargo transport through auction-based marketplace. Our platform allows companies to post freight requirements that drivers can accept through a bidding system.

## Milestone 1
[Milestone 1 PDF Document](docs/M1_Document.pdf)

## Milestone 2
### Milestone 2 Functionality
### Tech Stack
| Layer | Tech | Version |
| --- | --- | --- |
| Frontend | React | 19 |
| Build Tool | Vite | 8 |
| Language | Typescript | 6 |
| Style | TailwindCSS | 4 |
| Components | shadcn (radix, nova, lucide and geist) | 4 |
| Maps | Leaflet/React Leaflet | 1/5 |
| TEsting | Vitest and RTL | 4.1/16.3 |
| Formatting | Prettier and ESLint | 10.3/10.1 |
| Backend | Node + Express | 22/5.2 |
| Database | MongoDB and Mongoose | 9.7 |
| Auth | Firebase Admin | 14 |
| File Storage | AWS S3 | 3 |
| PDF Generation | pdf-lib | 1.17 |

### Frontend Setup - Jsut use the dev docker command
```bash
cd frontend
npm install
npm run dev # dev serever
npm run build #prod build
npm run format # auto format all files
npm run format:check # check formatting
npm test # run unit tests

# To add components to the frontend
# https://ui.shadcn.com/docs/components
cd frontend
npx shadcn@latest add <componentName>

```

### Backend Setup - Just use the dev docker command
```bash
cd backend
npm install
npm run dev # dev serever with auto reload
npm run build #prod build
npm run start # run compiled build
npm run test # run Jest tests
npm run format # auto format all files
npm run format:check # check formatting
```

## Docker Instructions
1. Clone `Milestone2` branch
2. Put `.env` into project root
3. `docker compose up --build`
4. Open `http://localhost:3000` (healthcheck is on `http://localhost:5001/api/health`)
5. To stop use `docker compose down` (to also delete db volume use `docker compose down -v`)

### Dev Docker Instructions
This will start all the services with hot reload so you dont neeed to rebuild when you save files
1. Run `docker compose -f docker-compose.dev.yml up -d` (you can run without -d if you want to see everything in your terminal but I dont like that)
- Frontend is on `http://localhost:5173`
- Backend is on `http://localhost:5001`
- MongoDB is on `localhost:27018`