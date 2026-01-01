/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
            },
            {
                protocol: 'https',
                hostname: 'n0tv1cky.com',
            },
            {
                protocol: 'http',
                hostname: '**', // Allow any hostname in dev (for VM IPs)
            },
        ],
    },
    experimental: {
        appDir: true,
    },
};

module.exports = nextConfig;
