/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['localhost', 'n0tv1cky.com'],
    },
    experimental: {
        appDir: true,
    },
};

module.exports = nextConfig;
