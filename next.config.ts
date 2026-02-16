import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
	devIndicators: false,

	turbopack: {
		// Prevent Turbopack from inferring the wrong workspace root.
		root: projectRoot,
	},

	images: {
		unoptimized: true,
	},

	// Static export for production deployment
	// Enabled when NEXT_OUTPUT=export is set (during Docker build)
	...(process.env.NEXT_OUTPUT === "export" && {
		output: "export",
	}),
};

export default nextConfig;
