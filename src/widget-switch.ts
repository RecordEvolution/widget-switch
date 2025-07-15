import { html, css, LitElement, PropertyValueMap } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { customElement, property, state } from 'lit/decorators.js'
import { InputData } from './definition-schema.js'
import '@material/web/switch/switch.js'
import { MdSwitch } from '@material/web/switch/switch.js'

type Dataseries = Exclude<InputData['dataseries'], undefined>[number] & { needleValue?: number }
type Data = Exclude<Dataseries['data'], undefined>[number]
type Theme = {
    theme_name: string
    theme_object: any
}
@customElement('widget-switch-versionplaceholder')
export class WidgetSwitch extends LitElement {
    @property({ type: Object })
    inputData?: InputData

    @property({ type: Object })
    theme?: Theme

    @state()
    private dataSets: Map<string, Dataseries> = new Map()

    @state()
    private textActive: boolean = true

    @state() private themeBgColor?: string
    @state() private themeTitleColor?: string
    @state() private themeSubtitleColor?: string

    version: string = 'versionplaceholder'

    private resizeObserver: ResizeObserver

    valueContainer?: HTMLDivElement
    boxes?: HTMLDivElement[]
    origWidth: number = 0
    origHeight: number = 0
    constructor() {
        super()
        this.resizeObserver = new ResizeObserver(this.applyData.bind(this))
        this.resizeObserver.observe(this)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        this.valueContainer = this?.shadowRoot?.querySelector('.value-container') as HTMLDivElement

        this.registerTheme(this.theme)
        this.transformData()
        this.applyData()
    }

    update(changedProperties: Map<string, any>) {
        if (changedProperties.has('inputData')) {
            this.transformData()
            this.applyData()
        }

        if (changedProperties.has('theme')) {
            this.registerTheme(this.theme)
        }

        super.update(changedProperties)
    }

    registerTheme(theme?: Theme) {
        const cssTextColor = getComputedStyle(this).getPropertyValue('--re-text-color').trim()
        const cssBgColor = getComputedStyle(this).getPropertyValue('--re-tile-background-color').trim()
        this.themeBgColor = cssBgColor || this.theme?.theme_object?.backgroundColor
        this.themeTitleColor = cssTextColor || this.theme?.theme_object?.title?.textStyle?.color
        this.themeSubtitleColor =
            cssTextColor || this.theme?.theme_object?.title?.subtextStyle?.color || this.themeTitleColor
    }

    applyData() {}

    async transformData() {
        if (!this.inputData) return
        this.dataSets.forEach((d) => {
            d.label ??= ''
        })
        this.dataSets = new Map()
        this.inputData?.dataseries
            // ?.sort((a, b) => a.order - b.order)
            ?.forEach((ds) => {
                // pivot data
                const distincts = [...new Set(ds.data?.map((d: Data) => d.pivot))].sort() as string[]
                ds.selected = undefined

                distincts.forEach((piv) => {
                    const prefix = piv ?? ''
                    const label = ds.label ?? ''
                    const value =
                        distincts.length === 1 ? ds.data?.[0] : ds.data?.filter((d) => d.pivot === piv)?.[0]
                    const pds: Dataseries = {
                        label: prefix + (!!prefix && !!label ? ' - ' : '') + label,
                        actionApp: value?.actionApp,
                        actionDevice: value?.actionDevice,
                        actionTopic: value?.actionTopic,
                        styling: ds.styling,
                        selected: this.isSelected(ds, value)
                    }
                    this.dataSets.set(pds.label ?? '', pds)
                })
            })
        // console.log('Value Datasets', this.dataSets)
    }

    isSelected(ds: Dataseries, value?: Data): boolean | undefined {
        if (!value) return undefined
        const on = ds?.stateMap?.on
        if (on?.startsWith('<=')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(on.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val <= comp
        }
        if (on?.startsWith('<')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(on.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val < comp
        }
        if (on?.startsWith('>=')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(on.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val >= comp
        }
        if (on?.startsWith('>')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(on.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val > comp
        }

        const off = ds?.stateMap?.off
        if (off?.startsWith('<=')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(off.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val > comp
        }
        if (off?.startsWith('<')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(off.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val <= comp
        }
        if (off?.startsWith('>=')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(off.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val < comp
        }
        if (off?.startsWith('>')) {
            const val = parseFloat(value.value ?? '')
            const comp = parseFloat(off.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val <= comp
        }

        const onValues = on?.split(',').map((v) => v.trim().replace('"', '').replace("'", '')) ?? []
        if (onValues.includes(String(value.value) ?? '')) return true

        const offValues = off?.split(',').map((v) => v.trim().replace('"', '').replace("'", '')) ?? []
        if (offValues.includes(String(value.value) ?? '')) return false

        return undefined
    }

    handleActionSubmit(e: any) {
        const switchEl = e.target
        const payload = {
            args: switchEl?.selected,
            actionApp: switchEl?.actionApp,
            actionDevice: switchEl?.actionDevice,
            actionTopic: switchEl?.actionTopic,
            label: switchEl?.label
        }
        console.log('Action Submit', payload)
        this.dispatchEvent(
            new CustomEvent('action-submit', {
                detail: payload,
                bubbles: false,
                composed: false
            })
        )
    }

    static styles = css`
        :host {
            display: block;
            font-family: sans-serif;
            box-sizing: border-box;
            position: relative;
            margin: auto;
        }

        .paging:not([active]) {
            display: none !important;
        }

        .wrapper {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            padding: 16px;
            box-sizing: border-box;
        }

        h3 {
            margin: 0;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        p {
            margin: 10px 0 0 0;
            max-width: 300px;
            font-size: 14px;
            line-height: 17px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .value-container {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            line-height: 0.9;
            flex: 1;
            overflow: hidden;
            position: relative;
            gap: 12px;
        }

        .switch {
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 12px;
            box-sizing: border-box;
            /* border-left: 4px solid #ddd; */
        }

        .no-data {
            font-size: 20px;
            display: flex;
            height: 100%;
            width: 100%;
            text-align: center;
            align-items: center;
            justify-content: center;
        }
    `

    render() {
        return html`
            <div
                class="wrapper"
                style="background-color: ${this.themeBgColor}; color: ${this.themeTitleColor}"
            >
                <header>
                    <h3 class="paging" ?active=${this.inputData?.title}>${this.inputData?.title}</h3>
                    <p
                        class="paging"
                        ?active=${this.inputData?.subTitle}
                        style="color: ${this.themeSubtitleColor}"
                    >
                        ${this.inputData?.subTitle}
                    </p>
                </header>

                <div class="paging no-data" ?active=${!this.dataSets.size}>No Data</div>
                <div class="value-container">
                    ${repeat(
                        [...this.dataSets.entries()].sort(),
                        ([label]) => label,
                        ([label, ds]) => {
                            return html`
                                <div class="switch" label="${label}">
                                    ${label}
                                    <label
                                        ><md-switch
                                            aria-label="${label}"
                                            ?selected="${!!ds.selected}"
                                            .actionApp="${ds?.actionApp}"
                                            .actionDevice="${ds?.actionDevice}"
                                            .actionTopic="${ds?.actionTopic}"
                                            .label="${label}"
                                            @change="${this.handleActionSubmit}"
                                        ></md-switch
                                    ></label>
                                </div>
                            `
                        }
                    )}
                </div>
            </div>
        `
    }
}
