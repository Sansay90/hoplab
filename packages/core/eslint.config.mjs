import { coreRules } from '../../eslint/core.mjs'
import { sharedConfig } from '../../eslint/shared.mjs'

export default [...sharedConfig, ...coreRules]
