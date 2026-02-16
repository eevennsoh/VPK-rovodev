import {
	HomeIcon,
	JiraIcon,
	ConfluenceIcon,
	RovoIcon,
	SearchIcon as SearchLogo,
} from "@/components/ui/logo";

type Product = "home" | "jira" | "confluence" | "rovo" | "search";

interface ProductConfig {
	Icon: typeof HomeIcon;
	name: string;
}

export const PRODUCT_CONFIG: Record<Product, ProductConfig> = {
	search: { Icon: SearchLogo, name: "Search" },
	jira: { Icon: JiraIcon, name: "Jira" },
	confluence: { Icon: ConfluenceIcon, name: "Confluence" },
	rovo: { Icon: RovoIcon, name: "Rovo" },
	home: { Icon: HomeIcon, name: "Home" },
} as const;
