# Environment Variables Configuration

This document provides the complete environment variables template for the Rise as One Basketball Program Management App.

## Setup Instructions

1. Create a `.env` file in your project root (or `app/.env` if using the app directory)
2. Copy the template below and replace the placeholder values with your actual API keys
3. Never commit the `.env` file to version control (it should be in your `.gitignore`)

## Environment Variables Template

```bash
# Rise as One Basketball Program Management App
# Environment Variables Template
# Copy this to .env and fill in your actual values

# Database Configuration
DATABASE_URL="sqlite:./dev.db"
# For production, use PostgreSQL:
# DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication - Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_ORGANIZATION_ID=org-your_organization_id_here

# Payment Processing - Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Service - Resend
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL=noreply@yourdomain.com

# SMS Service - Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here_generate_random_string

# File Storage (AWS S3 or similar)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Monitoring & Analytics (Optional)
SENTRY_DSN=your_sentry_dsn_here
GOOGLE_ANALYTICS_ID=your_ga_id_here

# Development/Production Environment
NODE_ENV=development

# Redis (for background jobs and caching)
REDIS_URL=redis://localhost:6379

# Email Configuration
SUPPORT_EMAIL=support@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Application Settings
APP_NAME="Rise as One Basketball Program"
APP_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# AI Configuration
OPENAI_MODEL_DEFAULT=gpt-3.5-turbo
OPENAI_MODEL_PREMIUM=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

## Key API Keys You Need to Obtain

### 1. OpenAI API Key
- **Format**: `OPENAI_API_KEY=sk-your_openai_api_key_here`
- **How to get**: 
  1. Go to [platform.openai.com](https://platform.openai.com)
  2. Sign up or log in
  3. Navigate to API Keys section
  4. Create a new API key
  5. Copy the key (starts with `sk-`)

### 2. Clerk Authentication
- **Format**: 
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```
- **How to get**:
  1. Go to [clerk.com](https://clerk.com)
  2. Create an account and new application
  3. Get keys from the API Keys section in your dashboard

### 3. Resend Email API
- **Format**: `RESEND_API_KEY=re_your_resend_api_key_here`
- **How to get**:
  1. Go to [resend.com](https://resend.com)
  2. Sign up for an account
  3. Create an API key in your dashboard
  4. Copy the key (starts with `re_`)

### 4. Stripe Payment Processing
- **Format**: 
  ```
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  ```
- **How to get**:
  1. Go to [stripe.com](https://stripe.com)
  2. Create an account
  3. Get test keys from the Developers > API keys section

### 5. Twilio SMS (Optional)
- **Format**: 
  ```
  TWILIO_ACCOUNT_SID=your_twilio_account_sid
  TWILIO_AUTH_TOKEN=your_twilio_auth_token
  ```
- **How to get**:
  1. Go to [twilio.com](https://twilio.com)
  2. Create an account
  3. Get credentials from your Console Dashboard

## Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
DATABASE_URL="sqlite:./dev.db"
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

### Production
```bash
NODE_ENV=production
DATABASE_URL="postgresql://username:password@host:port/database"
NEXTAUTH_URL=https://yourdomain.com
APP_URL=https://yourdomain.com
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use different API keys** for development and production
3. **Rotate API keys regularly** for security
4. **Use environment-specific configurations** for different deployment stages
5. **Store production secrets** in your hosting provider's environment variables section

## Required vs Optional Variables

### Required for Basic Functionality
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`

### Required for Payment Features
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Optional (for Enhanced Features)
- `TWILIO_ACCOUNT_SID` (SMS notifications)
- `AWS_ACCESS_KEY_ID` (file storage)
- `SENTRY_DSN` (error monitoring)
- `REDIS_URL` (caching and background jobs) 