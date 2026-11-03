// Оборудование для экрана: иконки видов. Значения параметров, значения по умолчанию и краткое описание — в @hoplab/core
// (каталог видов и их полей — у сервиса, service/app/brewery/kinds.py, GET /api/equipment/kinds).

const ICONS: Record<string, string> = {
  manual: 'i-lucide-cooking-pot', allinone: 'i-lucide-cylinder', easybrew: 'i-lucide-plug', mash_tun: 'i-lucide-box',
  hlt: 'i-lucide-droplets', burner: 'i-lucide-flame', hop_spider: 'i-lucide-hop', mill: 'i-lucide-wheat',
  chiller: 'i-lucide-snowflake', pump: 'i-lucide-waves', fermenter: 'i-lucide-flask-conical', chamber: 'i-lucide-refrigerator',
  glycol: 'i-lucide-thermometer-snowflake', controller: 'i-lucide-gauge', heater: 'i-lucide-heater', sensor: 'i-lucide-radio',
  hydrometer: 'i-lucide-test-tube', refractometer: 'i-lucide-pipette', ph_meter: 'i-lucide-droplet',
  thermometer: 'i-lucide-thermometer', scale: 'i-lucide-weight', stir_plate: 'i-lucide-magnet', flask: 'i-lucide-flask-round',
  keg: 'i-lucide-barrel', co2: 'i-lucide-fire-extinguisher', tap: 'i-lucide-beer', kegerator: 'i-lucide-container',
  filter: 'i-lucide-filter', bottles: 'i-lucide-bottle-wine', other: 'i-lucide-wrench',
}

export function equipmentIcon(kind: string) {
  return ICONS[kind] ?? 'i-lucide-wrench'
}
