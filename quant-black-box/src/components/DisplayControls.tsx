import type { DisplayPartial, DisplayState } from '../store/models'
import { ColorDropdown, ParamLabel, Switch } from './ui'

export default function DisplayControls({
  value,
  onChange,
}: {
  value: DisplayState
  onChange: (p: DisplayPartial) => void
}) {
  return (
    <>
      <ParamLabel>Color Scheme</ParamLabel>
      <ColorDropdown value={value.scheme} onChange={(scheme) => onChange({ scheme })} />
      <Switch label="Wireframe" checked={value.wire} onChange={(wire) => onChange({ wire })} />
      <Switch label="Grid" checked={value.grid} onChange={(grid) => onChange({ grid })} />
      <Switch label="Axes" checked={value.axes} onChange={(axes) => onChange({ axes })} />
      <Switch label="Auto Rotate" checked={value.rot} onChange={(rot) => onChange({ rot })} />
    </>
  )
}
