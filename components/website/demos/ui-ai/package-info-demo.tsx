import {
	PackageInfo,
	PackageInfoHeader,
	PackageInfoName,
	PackageInfoVersion,
	PackageInfoChangeType,
} from "@/components/ui-ai/package-info";

export default function PackageInfoDemo() {
	return (
		<PackageInfo name="react" currentVersion="18.2.0" newVersion="19.0.0" changeType="major" className="w-full">
			<PackageInfoHeader>
				<PackageInfoName />
				<PackageInfoVersion />
				<PackageInfoChangeType />
			</PackageInfoHeader>
		</PackageInfo>
	);
}
