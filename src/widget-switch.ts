import { html, css, LitElement, PropertyValueMap } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { customElement, property, state } from 'lit/decorators.js'
import { InputData } from './definition-schema.js'
import '@material/web/switch/switch.js'
import { MdSwitch } from '@material/web/switch/switch.js'

type Dataseries = Exclude<InputData['dataseries'], undefined>[number] & { needleValue?: number }
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
            ?.forEach((ds, idx) => {
                // pivot data
                ds.selected = undefined
                let label = ds.label
                if (this.dataSets.has(label ?? '')) {
                    label += '-' + idx
                }
                const pds: Dataseries = {
                    label: label,
                    actionApp: ds?.actionApp,
                    actionDevice: ds?.actionDevice,
                    actionTopic: ds?.actionTopic,
                    multiChart: ds.multiChart,
                    styling: ds.styling,
                    selected: this.isSelected(ds)
                }
                this.dataSets.set(pds.label ?? '', pds)
            })
        // console.log('Value Datasets', this.dataSets)
    }

    isSelected(ds: Dataseries): boolean | undefined {
        const value = ds.value
        if (value === undefined) return undefined
        const on = ds?.stateMap?.on
        if (on?.startsWith('<=')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(on.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val <= comp
        }
        if (on?.startsWith('<')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(on.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val < comp
        }
        if (on?.startsWith('>=')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(on.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val >= comp
        }
        if (on?.startsWith('>')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(on.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val > comp
        }

        const off = ds?.stateMap?.off
        if (off?.startsWith('<=')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(off.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val > comp
        }
        if (off?.startsWith('<')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(off.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val <= comp
        }
        if (off?.startsWith('>=')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(off.substring(2))
            return isNaN(val) || isNaN(comp) ? undefined : val < comp
        }
        if (off?.startsWith('>')) {
            const val = parseFloat(value ?? '')
            const comp = parseFloat(off.substring(1))
            return isNaN(val) || isNaN(comp) ? undefined : val <= comp
        }

        const onValues = on?.split(',').map((v) => v.trim().replace('"', '').replace("'", '')) ?? []
        if (onValues.includes(String(value) ?? '')) return true

        const offValues = off?.split(',').map((v) => v.trim().replace('"', '').replace("'", '')) ?? []
        if (offValues.includes(String(value) ?? '')) return false

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

                <div class="value-container">
                    ${repeat(
                        [...this.dataSets.entries()].sort(),
                        ([label]) => label,
                        ([label, ds]) => {
                            return html`
                                <div class="switch" label="${label}">
                                    ${label}
                                    <label
                                        ><mdif3-switch
                                            aria-label="${label}"
                                            ?selected="${!!ds.selected}"
                                            .actionApp="${ds?.actionApp}"
                                            .actionDevice="${ds?.actionDevice}"
                                            .actionTopic="${ds?.actionTopic}"
                                            .label="${label}"
                                            @change="${this.handleActionSubmit}"
                                        ></mdif3-switch
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
