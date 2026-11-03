import { apiRules } from '../../eslint/api.mjs'
import { sharedConfig } from '../../eslint/shared.mjs'

export default [...sharedConfig, ...apiRules]
