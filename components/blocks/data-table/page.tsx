"use client"

import { DataTable } from "./components/data-table"
import { SAMPLE_TABLE_DATA } from "./data/sample-data"

export default function Page() {
	return <DataTable data={SAMPLE_TABLE_DATA} />
}
