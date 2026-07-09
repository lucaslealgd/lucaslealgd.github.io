import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

import * as ExternalPlugin from "./.quartz/plugins"

ExternalPlugin.RecentNotes({
  title: "Últimos diários",
  limit: 3,
  showTags: false,
  hideTagPages: true,
  hideFolderPages: true,
  filter: (f) => f.slug?.startsWith("diario/") ?? false,
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
