function toTitleCase(slug: string): string {
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function getTemplatePageTitle(templateSlug: string): string {
	return `${toTitleCase(templateSlug)} — VPK`;
}
