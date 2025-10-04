# Peta-eta Finance Hub Setup

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   Open http://localhost:8082/ (or the port shown in terminal)

## Supabase Configuration (Required for Full Functionality)

The application uses Supabase for authentication and data storage. To enable all features:

1. **Create a Supabase project**:
   - Go to https://supabase.com/project/create/new
   - Create a new project or use an existing one

2. **Get your credentials**:
   - Go to Settings > API in your Supabase dashboard
   - Copy the Project URL and anon (public) key

3. **Create environment file**:
   - Create a `.env` file in the project root
   - Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Restart the development server**:
   ```bash
   npm run dev
   ```

## Running Without Supabase

The application will run in demo mode without Supabase configuration, but with limited functionality. You'll see helpful error messages in the authentication flow.

## Troubleshooting

- **No output on localhost**: Make sure the dev server is running (`npm run dev`)
- **Authentication errors**: Check that Supabase environment variables are properly configured
- **Port conflicts**: The server will automatically try different ports if 8080/8081 are in use

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

