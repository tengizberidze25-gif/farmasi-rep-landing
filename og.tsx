// ════════════════════════════════════════════════════════════════════════════
// /api/og.tsx — Dynamic Open Graph image for FARMASI rep landing pages
// Runtime: Vercel Edge
// Returns: 1200x630 PNG personalized with rep's photo + name + city + logo
// ════════════════════════════════════════════════════════════════════════════

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby0BJOvqZZz4eK5zHyep36R3vcPvweNk8ob-sOcCEokNoGto9m1BrfBxNlBcBB81pJ5/exec';

const FONT_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-georgian@5.1.0/files/noto-serif-georgian-georgian-700-normal.woff';

let fontDataCache: ArrayBuffer | null = null;
async function getFont(): Promise<ArrayBuffer> {
  if (!fontDataCache) {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error('Font fetch failed: ' + res.status);
    fontDataCache = await res.arrayBuffer();
  }
  return fontDataCache;
}

// FARMASI logo embedded inline as base64. Inlining avoids Satori's silent
// fetch failures in the Edge runtime and guarantees the logo always renders.
const LOGO_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAR0AAAB4CAYAAADPJCYmAAArX0lEQVR4nO2debxO1frAv2sP7/ue2Xgv0iBkjjKTaBBHIVRX1FUu16000lUqGhRKv4S6kqSBDJWUMQ0arkwh0yHkkijzmd9h771+f7znCGfvM3nfcw729/M5H961915r7bWf/exnrfWsZwlcXIpIY5B18FGzanWqVvsrtS6oRmIgSM2qlVFkCE2FChWrYqT7sYI6x03BUZ+XP+J05mxYyetfLRJFLbMeyCQgCxCAD5XDmOwK/3Q5i3AfmEuhqAWybqXKNK9dl0aX1OTC8hVJ1HTiFJ3sI4e5uHJFjh3cT0KcF9MI4s82yA5JgkosiRfX4POULbz79ed8nvF7oWSuZUKirFOjOg0uvZhKPh8XJlUgRvFghBRUTxwHj2SQFedjtxZi5pIFbN+725XlswSttCvgUra5EkV2btScble2pGbFyohQiKCZjR8Lrz9AueMZXBCXwLEde6j81/IYgSCmAVZIofIll7BHETy/8ENe3bymQKVwnZYkO9RtwrVXNqNGxfIowWz82Wkk+nwE0jPxopHgK8fBg+lcWbMBP2UdZ/lP37kK5yzDfVgujjzXrqPs0qQZfzUUErODkJkJWOixHgIqWFlZlA+oIBTwCQJGAK/XRwBI9/rYp0qenvsB848eyFfObiiXKG9u0o72dZtQRfUhjmcQE/Dji/FimdkosT4yjxwhJiYBRXpJR3C4XDyTly/hxZT/ujJ8luE+MJc89KpQTQ7u2otLvLEkZPuJkxIPIMwQSBMhFFBUQIIlIS6G4LFjeLyxYKqkCsne8rEMeXsyy/ypjjLWRnhl/xs706xqdWrGVUYcz0JmZhHv8YJpEco8jqWCJ96HpahYms6hrCBcWI1nF8zmjZSNrvyehbgPzeUElyHknc2v5Y7211AhM4AvIxMtGMA0AqBIdJ8OioCgCQEDkOARZJkhhNDRfLEYwsMBVeGxue8zN915/OaOS+rKATd0ppo0ScwOkmiqxKgahAysQBBFUyExDkLZhEIGlkcnVYHMpERmrPqep1Z+78ruWYo7puMCQBtvOTm4c3c616iDfvAoMX4/mEGUeA8ShaAwMEw/ImCiBUw04QWfh4AaRMTHolgeUlWVw4kxjJkzM1+FM6zFVfLmZq241OslJjWVBI8HQiZmIANV0VDKx4IMkpH6B/HxiYSwsKTEjI1jc/oRV+Gc5bhKx4WmMbFyQMdOXFP7MrT9h4jJykaN84KqYAbSCXkEqApC0dA1HVUXYACmiaJ7yPQbmLqGP6kck79ZzDu/Og/sjmjZTt7eqi3lggbiyFFULPyGgYZE01UwQpCeTUhXiE9IAFOiqDqGL4bD0mDc7PdKsGVcooGrdM5zGoF8+MaudKhdH+v3P/AICzXRB9lpIExUn0YgFECaAtXjwbRUUDUQAisYQs8WJHh8pMYn8uX2rby6Zq2jwnnmuhvkP5u0QjtwCJ+wUD2QaZp4fCqqKSFgggV4YtCFAn4TpA6qSqaq8flPq/k20+9aOWc5rtI5j6kJcuiN3WheoRKeY8cgkIWiamAGQBrg80EoSKzuBUUhYFiETBNTEajoCNUHqkqWNNidmcE7SxY5lvVwkxayR53GxBxOIwkBMT6C/gwSEuIJZofQpAXxsRAIQXp6+KKEciA1sqTJPstg6eafSqZhXKKKq3TOY25r0pLkyxqSkJFJVlYGqipRvQKCMjzFYJjhQWPNC5aKapkoioYiNFRTIBWVNAFpSYl89O1Sloeyba2Q+y5vIR9ocwMXS5WMjP2EFFAzgwgJgSOZJPjiIWggjx0noBn4kuJB8WEFDEIKZMTF8sXuTSxLO+ZaOecArtI5T7m54gXyb+2vQz2aihYMkKCBUFVkyAQhQNfDVofmBVMB00RFIHw6mCBDBpm65HiFBL7dv5uxG+2d/9pXukD2uuoa4oJw8NBvJFRMJKRIDMtElQpxUsfKDqIYFiIxCV+MJGgZWIEAhlDIwOKYBp+t+K6km8glSrhK5zykFsh/XH8jlYICxTLD0+GKBwIGlt8Puge8XqRXQeg+CIXAAqGo4alyI4QhIcunsUMPMuX7LxzL+scNXansicOvW2iJF7DfCpCWkU6CHkOcVEkKCjShouoWKOFB5aAVRBc6+HyEdA+b9uzmh8w018o5R3CVznlI9/pX0LTaRXj+OESCz4PiD4W7Uagoqi/s8GcCqhdTSgxT4tU0UDVk0I+pSLRYHzIxhiU/reS7g3/Yd6uu7SKbNmvG1jWrOHzsD7ZsT2Hr7h1YKCh4uDShMu0vrkmj6tWpXv0vKMJECQaJUbyoQuFowE+ofCJfrl9Tsg3kElVcpXOe0RjkLdfdgDc1kwrCA1kZ4RkjAegKeDxYpoVlSIQMX2OaJpbPi6IJMqSJ5vNieiS/HtvPlyu/ty2nbvmqsnHbljw+fSLbf97Mdr95kmKyAD9fpf/Kj5t/lXU3a7Rr1ZxrGzWmTmw8HM3EkhYJlcqx6egfrNr/S7SbxaUEcZXOecaNTVtSwbCINQwIBEGaEBsLEoLBIFKTeFQNTVEAE3QNy5BYWFiWxLRA6hoHAul8/XMK67NCtlZOfIVy/PO5kY5doiurVpct69TlmgsvpprPQ1y8B08ghHEsA80UKLpOWiDIT7/vJcX1nD+ncJXOeUQdkL2at6ZS0CSQcRRfQgKEFDBDgIpH9YAEDAukDI+xSD++chpGWjo+NYZySgyHA4J9CfG8vWq1Y1lrd6XkURSXgbz6wgvoflUHGlS/GF/ARM/MQpMWRmYQIy0dTUsERedoZgZmtYosWPRjFFvEpTRwlc55RMf6Damm+EgwshExOhjZ4RXiUjn1RJnzh4WJgWVY+HQVTAsrJJFJMXy5aRUpVuEtkLtr15a3dLiGJlWqoPxxBLFrD+U0D15dx7AsTA9YQgv3vKSBSIjj1/Q0vjlQuPg7LmcPrtI5j+jUtA2xloLlD+KN8RDIzsCreYHwu64IK6xshMxJsfAIDcs0UVQvWJDtUTluhvhmjbOVczJdYsrL2zslc+0VVyBTj5G5Yx8VdY0KFSpDMAiWiSktsAQxHi8ETEKmxEyKY8OuLdFqCpdSxFU65wk9K1eXdStVRTmSjgwEIC4ORTnJwhEyx7rJMSyU8H81BJYVFhO/BCPBx+pd21iRkVGgBfLv+s3kwBu6oRw/TmjbbhI8OuVjElCCAazUDBRVgKYghECxcsJlmCH8ikKaR/DDtk2RbwiXUsdVOucJnZo2p3y2hS9koaoaWBaarmOZORYOYAlQpELYKcfCQoGggaroWEGLoK6T6lFZuHZlgeVNvK6b7FyzPpUOpZMoVRQlBkwDTAvQQBVgmqBKNEVFkUBIYloCmRjLPn8GP+3bG9U2cSkdlIJPcTnbqRvnla1q1kVLz0ATAqGqEAohZXhO3ALkCbslV+GE0xRLAXSEokNsLFuPHOSD4/Z+Obk8f/X18tYmLaniNygXNFD8fggGwDDCisY0w1aV7gFLhoVQqjm+QRoyNpYtB39jo3Rnrc5FXEvnPKD1ZXWprOh4AumgqUDY90ainPTVsU65xsw5oKoeMCVS8xLQPXy+Mf/ZpNc63ixvb9aWrE3biPN4AQFeFTxgGCFM00RHQTEVCPnBp5zSrTN0DxlC8MPObZG6fZcyhmvpnAe0rFEbkZ6OTwCYICwUzYOqqqeeKMJWDlg5lo8CqkYwGCILOC4kyzdvdCznsYYtZOeaDfDsP8gF3jhEjA90CVYW/lAWlgaqT0MqIhyB0OsBVc8xs1QQKgFVcMwMsuXXPdFqDpdSxlU65ziXg7yy6oXEWhIhQ2GlogqEEASDBrYikNOpCc+aS5TYeDJVlXX/+4X1mLZdntsqXyj/3r4jlbNM4vxG2PfHCoJqEPSC5REEFRPTshAiR+lIC0JGuEBLkh00URIS+Wn3L6xLtV+x7nL24yqdc5w2l9Skogm6GQoP3qpgIjFN88QAriKVE0seci2d3O5WyLLIAvxxPr7b4jyb1Ovqa0gIGHiyssPaSgPMbIKahaFYWMJCtUCzQMH608dYyvCKdkVFenXSdcEP29yp8nMZV+mc43S8vCnlDVCkCYqJVCxQwkpHVT2ERSA8tqPkKB5L5LjqoBAQgpDPw0ER4vs99srgzho1ZNsGDVBDAYQIrxbHI8lWJYYSzs9jKsQYoJqEB4whrHjU8FS5IS2MOB/7/Jn88EtKlFvFpTRxlc45TNuYWNnkgouICYXQhYUUBpZlIBWRo2DEn3+neSWrOQrIjyQY72Pt/3byk80aqFoge7XvgHX8KLpl4onRAIOgNNF9XiwBqqXgyVU2Jjll5Vg7msAMBcmUBqE4Hz/u3c06d63VOY2rdM5RaoG8ve11lBcawh8MO+IJicRERaIpejgyoNTCSiDnzxI5U+U5SieoCDJ1hSUb7D2Qr7mgOldUrYr/4CE8WKCAFBaKooQXrpsKHlMBK+cvV7mJnBkyAdkihBnj5QgGn29y11qd67hK5xylUUJ1OjdqhpYZQDGN8FiNZaIBwrRAVf+0Ok6yck746+QoHT0uht1H/+DT/XttF3DecvU1eI6kUtnrIVYREAwiLImmebCyDXRTCVtNUgmv8wr35sLBCBWLgGVgaQpWvJeNe3czL5+dJFzODVylc47StXlbKgYV1KCJEBIsI/yvqmGGjHBIUhus05KlR+XrVT/YntuuVmMaVamOdiydcpoXzbAgEAh7HZsqupHjj2OdpHBUMFUwRVivWVJiKYLjwWw+X+mGJD0fcJXOOcitFzeUXVtfRfDgYXxCoCkqGBKECqpKyDTCJ6oapiKwhBo2cSSoFkA4MLtfE+wP+lmweV2eMurikbddfy1aegblNA/4/WCZf65QDxmg6TkWU1jMLEXBVP5UbKZQyPbopOoa+7LSWXHg1+g3jkup4yqdc4zGaHJwt26EDh+gvFdDMSywtJyxGx0zaKDGxhISIYKqhR+FEGo4ALs/iCIUkCaZikVmvJdp337OJpuB3Z7Nr6RmnBfdMnO2Nc/RNroCKuEtbKQBugaKgmEaCEXBMAx0rw9hWgQRHPF4CVStxpRFC9niDiCfF7hK5xxj2O13UsWyUDLSsEJZnJifzhm7EVI5MUiMsNA0BdMKYWVmQkIiVlomqi+OY0KwV4ZYlrI1Txk3VvyL7N74SipmBYkxrJxFooRVRk4X6sTYTTALaYXQ4mLJzEjDGxdP9vFUsCQhCUZSEgvWrmbr0YNRbxuXsoG79uocoSbIoZ160qbKJWhHjxGva1i5DoEyJ06OtMJjLGEfQUAiZRZCVcCngmGgxJQjPd1AXHoRk2ZMZ5uN9XHvDd2oY8YQeywDXdfC4zUiPDAMud0nK6zchEBoCv7jx4hPTIJsP4oEPTYeKUz2HD3Mwu+/s52Odzk3cS2dc4BaIPs0asE1tesRl5pOedPCGwwSo6l/rqcSJy3oPMnSEaqBZWZCjEp60E+aJdEuvZSpy5fz/t68M0kjGl0lW/31IpL8El2qOUG/BKYQWCg5zoDhtVsnD0r74mLwp6cTsky81arx6+/78VUoz6IV3/PV8SOuwjmPcC2dc4Ab6tWhzw0d0Q8coZInPhzj2LJABsNPOMcf5sSALrlT4wYqIRSfSnZ2JlkejcBfK7Ps5y08/cPXeRRB8l8ulv/omIznwGHwZ4fHa4TAPMnKETJclpAWqgTLNDBCBlpSIgqSbAlpqcdIuvgi5v/3e77a4m4VfL7hWjpnOQ82qC/v69IV/cgRLoiPg0AWZGfkePdJEBJLSEJqTgz2HOWjWmGv4+xgNng1gh4No3IFVqcfY+y8D/OUc6W3nHzw5l5ox4+hGwHQBBj+Uy0oCFtP0kKVFoq00DQPmlAIpmejxyeQ7fWQGutlU/pxXl/xpTt4fB7iWjpnKbUrJcj2F9bgofadKX8kA6/QUP1ZgAE6EMqC+FgwgxgqBJWwHtJyPYRDgNDwaD6O+0OkemNYu/83Rn++iB2WP48ieLLTTTTXfBiZxzA9FiQmQmoaWBLVCofLCFs74a6cYpHjcqyC6sUjBL8eSiVQpQK/YvDw+2+64zjnKa7SOQupoyC71m/Mne2uJeG3IyQagqDhx1RB86iYikBVfVgBP1JXkShIFEyhIISS4xiogCLI9iXgrxDDf3f+wvgFn7LONPIogsk39pAdLqqO5/BhysV5MUw/xw/9RoIvHpXwILUqLYRl/TkzZuVMX1mCkBUizaMTU7MmGw/vZ/TMt12Fcx7jKp2zjFsTK8h/JN9E02oXYf3vEImqiikkllfDUCyCSFRdRTXDsZAtAxRdR5MKAdPEtCRS0Yjx6WRq8Hu8yuw1K3ny229tlcDEFlfLjuUqkWT5sbQgZAdQFIGI8xHy6lgBA90SYFgoITNnW4lwr90UkKGa+JPiSS+XxLe/pPDW0oWs8Ke7Cuc8xn34ZxEPNW4qezRsSr24RMpnGWimzDEmTEJCEsrxyVGFgoZAJ7z8IGRJspEYHh1ifQQVwbH0DPZmpjPl88/4+NghWzkY1qSZfKBpW6pJiRVKxQhm4dHjweMhzbIISYhTVWR2EK8lUDQvoIS9kRVBVpyXQ7qGUfUvvPf1VzyzfIkrby6u0jkb6NKksezVtj1XVPorlTOCJBzPJDHTQARCBC0LRVPRVO3PaQFpYRgGpgTF48GvCAIejaw4D/tlNj/u383iDatY+L/9js///65Olne0aE2ltFRERlp4Yz5NgPCE978SGpYWtrJ8Xh0lYJGVmg4W6Anx+ONiOKRJNqYdY+rSRSw95G6a5xLGFYSzgCsvrCYbV7uIyypUonZiBWrGV6CKNxavBE2PQVoWIhRCGjnex6qC1FUsTeNoWjrpIT97D/7Bql+28/3ubXxrBvJ97iO73CLvbtQMc8cuKmkC3cgmxquBx4MRNPEb4XLVmBiO+NNQfBpC1RGqhjchnjRLsnrXDr7dtplFKT/xsytnLifhCsNZSE1NyCrly/PX8hVRJSR6Y6mYkERsTAxSStKzMjmUkUpGViZ7fv2NDCNYqBe/xV9qyKcG/Isa3lhCu//HZZUqE8o8juL34zUtLAEZioJQVLyWTiBkolaI45iVxRErxL6sDNbt2cmKzZv58pB9l83FxRUMlxM0jKsgW15Um2reGOpdciFeISiXlIBPKHgME8uyCGoqFgIzI0BmdhYH0o+Qsm8vG3/bw55gJjtdmXIpAFdAXApFbaFKKcNBwOzWY7m4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4RJrhw4fL0q7DuULXrl1lw4YNS7Q9mzdvLq+99toy+wwff/zxMlu3sxVRq1atM2pUKSW6rmOaJlJKhBDs2LFDRKqC+dGhQwe5fv16atasybp160qkzIKoWbOm3LVrl6hdu7a0LAtFUU4ck1Kyc+fOMlFPO6ZOnSqDwSD33ntvidVx2rRpMi0tjYceeqjMtUvfvn3lggULqFatGikpKWWufnY0adJE9uzZk8svv5x+/frZnjNx4kQ+++wz5s6dG9V7qlOnjkxISADAMAw0TSMzMxOSkpJkpP+ieSMnM2fOHJmUlCQXL15cZr5GRW2r2bNny9GjR8tu3bqV+j188cUXJfr8INxeX331Vanfux1fffWVTEpKkpMnTy6T9TuZevXqyXnz5hX5Xb3//vujdm/Dhw+3LVNEQ8hSU1Oj/lVo0KCB3Ldv34nfNWrUYMOGDaX+NTrT9pw6dSpvvPEGX3zxRYnfS27de/TowfTp06Ne/j333CNnzpwJlIzMFIVcKzqXsla/kxkyZIicOnVqsa+fNWsWycnJEb+/CRMmyKeeeipPumJz7lnBP//5z1N+P/DAA6VUk8gyYMAA1qxZwxdffCFvu+22EvvC1qtX70RZ8+bNK5EycxVOWeSee+455feTTz5ZJq2dyZMnn5HCAejduzcrVqyIhvFhm37WKp0RI0ac8vvhhx8upZpEh169erF06VL+85//lIiw169f/5TfzZs3j2q511xzzSn5X3/99WXmpa5Vq5Y8/aM2ceLEUqqNM6NGjZLDhg2LSF7Jycm8++67EX0GueM5pxNxpfPmm29GOss8PPvss7aNM2rUqDIjuJHiscce45tvvon6fV166aV5yo0mTzzxxCm/O3ToENXyisKYMWNs0//973+XGfnq1KmTfOmllxyPf/DBB3Tr1o3U1FSR+1ejRg0eeughx2vuv/9+Bg0aFLF7fOihh0SLFi0YOHAgkyZNOpFuO6YzcOBAxo0bV2b7sPmNm5R239uubsOHD+ftt99GURQSExOJj4+nYsWK1K5dm6pVqzJ8+PAC850+fTo9evSI2r0tWrRI3n777aekRWvWpk6dOvL3338/Je3111+nb9++ZULmyrJ85bJixQqZnJxse+z666/no48+yreeU6ZMkY8++mie9MmTJ3P77bdH9x7tRpcfffTRMqPRT+euu+4qtdH4wmBXp8GDBxeqTvfff3++9zZy5Mio3ZtdeaNHj45KeePHj7e9v2iUVVRGjx6d7zMoyXE2J1q0aOFYv6L4Wb300kunXNuzZ8+o3FurVq1k//795YQJE+SMGTPsZ68GDRrEiy++WCY0+ukURjhL82sUCctx+PDh8rXXXrM9VrVqVbZt2xbx+3Nq12i0ZUmWVVQKkq/FixfTpk2bUq3n448/Ll9//fU86cnJycyaNatIdVuyZIncs2cPgwYNivg9DRgwQM6dOzdPuu2YzskObWWJwvqy3HzzzaX+NTqZo0ePFun8F154QTg5dt11110RqNGp5PeFK6yVVliGDh3qmF/79u1L9bkV5l6Tk5MpbQ/qunXr2qYXVeEAdO7cWURD4QA0bNjQNt1Wu2RmZkajDmfMkCFDCnWeXV+1NClfvnyRr5kwYYL46KOP8qSPHj06ElU6hdq1azsee++99yJaVn4TDU2bNo1oWUWlsPdaWDmMFnbyFOnnFAmCwaBtuq3SiY2NjWplikP79u1lt27d8qSfPnUO0KVLF6677royY+0EAoFiXffKK69EuCb2OH2RcomUt/Qtt9ySbz7NmzePRDHFolevXrZ1s5OvPn36cMUVV5SafNn1RDIyMkqhJvlTJKVTFnnyySdt04cMGSIWLFiQJ/2RRx6JdpUKja7rxbpu586dtumtW7eOqMAPHjw43+ORass777wz3+P/+te/IlJOcfjiiy/ypM2aNYshQ4bYdj1KU77seiKnOzOWBTwej226rdKRsswYCQA0bNhQ3nLLLXnSe/XqBcCUKVPyHOvTpw9NmjQpEzdS3Pbcvn27rcCX9Jhb9+7dady48Rm1ZePGjeXf//73SFUporRq1cr23v7zn/8A4YmV0ylIUUeTtWvX2qbffffdZULec7EsyzbdVnqFKPVJhFMYOnSobfq0adMEwHvvvWdb4dIUjEjQsWNHWyHKzs6OWBmdOnUqlKAWZKUURGHH2dq1a1fiL46TV++nn34qAMeZ3JdeeqlUXvL//ve/tukff/xxqQ/GF4Yyr3Tq1asnH3zwwTzppwuKnYIZMmQItWvXLvMPwYnWrVvbpkcyjMeVV15ZqPOee+65MyrnvvvuK9R5V1xxxRmVU1QaN24s7WYET7fKnn322TznjBo1KlrVypcVK1aIDz74wPbYhg0byuw6sVxslU5WVlZJ18MRp6nj4cOHn/LiPf/887Yv4j/+8Y8o1KpkePXVV6NeRr169fKkOVmI9957b7GEediwYbbX2VmwJa107r//ftv0iRMnniJPdn4xUHpBvvKbxZw4cSLLly+Xf//738uk8rF1Dnz++eeZPn06pmk6jkDnYprmiQA9MTExrF+/PqJmkl39JkyYQL9+/fKU8/7770u7L2pJOp3Z1ffuu+9m/PjxRarDG2+8If/973/nSR8xYoTj4GZxsKtvlSpV6NSpE++8806e84vTlnZl9O7dmw0bNrBt27aIlFFc7Oo2cuRIHnnkkTx1mD17dp6FoFB6To39+/eXdm4Vp/Pggw/y4YcfsnXr1hKt55gxY6SdcrS1dJ544gl27NjBL7/8wr59+/L9O3DgAIcOHeLAgQP88ssv9O7dO2La1clMfOONN2zPd1oJ/PDDD5dJje/EiBEjbBUOhBfyRZvt27eLCRMm2AroTTfdVKS2dJKHN954Q6xatapU+/Evv/yybd2cQkU4pffr169U5GvatGnijjvuKPC8V199ld9++42FCxfKoj6/aBDxaRCnEeviYKdEpk+fzooVK2yFddWqVWLhwoV50qdNmxaxOkWT+vXryzlz5kinbtW4ceNYu3ZtxF7U5OTkfAXQzk+oqHGL7CyDcePG5XvN1VdfXSIvht04zVtvveVoESxbtkwsWbIkT/qAAQMiX7lC8tprr4kmTZoU6tw+ffrw3XffUZT1gNEg4konUjMrd955p22jFOR56dTXLav9WwjPUk2aNEn+9ttvDBw40PG8gQMHRtQyqFWrVp60OXPmnPj///3f/+U5fuuttxZ6+vzyyy+XPXr0yJM+fvz4E///9NNP8xyvU6dOYbI/I5zGp/ILFwGcEqIhl5tuuokOHTqUmnx98803IjU1VeQXtuJ03nvvPZKSkmRpzBZGXOkkJSVFJB87YQT4+OOP833xFi5caHt8/vz5EahV8VBVFQgHxnrggQfkCy+8IKdOnSqXL18uk5KS5OrVq/PElzmdyy+/POL1atWqVZ60devWnfj/5s2bxYcffpjnnMK6IthZEm+//TZbtmw58YzWrFmT55yWLVsWKv8zYcaMGbbpBXX5ZsyYYXu8LCy9eeaZZ0S1atWwCxHqxMaNG0t86t9R6eS+pEuWLMn3L7c7s2DBAj755BP++OOPM66Uk9l/7733Fup6u+US4OzqHm1yXdT9fj/vvPMOY8eOZciQIXTv3r1Q17dp04bvvvsu4uMfpwfuAti1a9cpv+26Qk5+UydTr149aTfzePp43OnlgfOCxkhx++2328rBjTfeWKjr7cZR+vTp4+hkWJKkpKSIoUOHiipVqtC3b99CXTNq1CgWLlxYcnW3i8nxxBNPlGrjLV68+IzjrdhdXxIR+OzKfeqpp06U261bt3zjtZz8t3jxYhlNr2q7Mps1a5anPLvzCtpvbOzYsYV6hu3atTvjZ11Uvv/++6jI14wZM0pd6djRo0cPOX/+/ALlbebMmRGt/5gxY2zLsbV0CpomjybNmzeXvXv3zpNemOh6J2M3+9OtWzdKejM5OHWtzKeffipOHtOwY8KECdSvX5/k5GQRrR0unAZr7Qaqb7311jznOcX7yeWFF17Ik2Zn2TlZcNFaUNm1a1dpZ9EUdYDczgIsrCVe0sybN090795dNG7cON/nds899zBixIiovx9lLp6O08MfNmxYkV6+J554wvb8SAWyLgppaWmn/H7++edtz+vfvz+pqamiX79+4ocffoj2RmiFPnfq1Km2dXHqpjhNIb/77ruFvqdmzZoV9tQi4TQe9dxzzxWpvZ1eXqdp+LLAt99+K+644w6R35KWknBItdUuxQ3FcKZcdtll0k4o7BZ0Fga7mYbBgwdTv379EhWMxMTEU37v3LlT2M3qlOTUvp3nb37l2wVqX7Roke25n3zySZ60/MaBpk+fnietsMszikKzZs3kbbfdlie9oCl8OzZs2CDs2stu8LysMWnSJGE3iZBLtIdXbJVO7mxLSeO0PL+42384XVfSfhV2oQimT58u7GZQlixZUiIK8fHHH8+TZjeTdNL5tpbA6VOuTotUn3rqKUdL4qeffsqT1qBBA8e6FBe7NXxg/3EqDE7XlaVdI5xYunSp6Nixo+2xwg6oF5cyFdri6aeftk3ftGkTU6ZMkY888ogsSqjI1atX2075PvPMM8WuY3Fw2v/npptuyvMi/u1vfyu19Tw7duzI97idEj997ZLdi21nyZzM9u3b86R17do132uKg1PX6uWXX2bGjBly6NChRfLY/frrr20VqZPHfFnjww8/tF046rTLRKQoM5ZOQUsVHn30Ud566y1+/PHHEzMHn3zyiXz66aflnXfeKZ0CWzkN2j799NMl9mIbhuF4zG6Q9vXXX6dFixZRq59T3hs3bsz3OrtFjwMHDqRWrVoSwt1ju2nagqbY7SwdgEaNGkWsDfIba+nVqxf33nsvb7755gmP3aSkJLlw4UI5ZswYOWjQINmhQwd52WWX5cnjuuuus82zoCiJZYV3333XNj2aToNlJnJgccYz+vXrxyuvvMKnn37K1q1bGTt2rDz9hXJyFiypUKAFMXXqVFtrzO7rHymc/GB27NiR72DqypUrbaM05loQdlbOrFmz2LVrV775Oi07KCiMalEozlhLnz59GD16NLNmzWL9+vUMHz6c7t27nyJfTs6qy5YtK2ZNSxY7PymA+Pj4qJVZJpTOHXfcUSSt+tFHH/Hkk0/Su3dvLrnkkhO7GA4bNkysXr06jxA47aDQp0+fMvE1coo1E2m/iVzs4vQ4DQqfjt2szciRI6lTp460c2sobFfDrvxIxUwu6oLfhQsX8sILLzBgwAAaNmx4Qr7uuusuMX/+/Dzydffdd9vmU9gAaaXJ6TOrucTExEStTC1qOReBzz77zPHY7Nmz2blzJ2vWrGHjxo2sX79eXH/99UXK/9VXX7UN4WG3OLQ0+Pnnn8WwYcPk5MmTT0m/55576Nu3r3RyvS8udjNRP//8c6GunTVrlm1bjh8/Hjv/qk8++aRQdbeLB924ceNC1akg8rOiP/jgA7Zt28batWtJSUlh/fr14qqrripS/uPHj7dtk8cee4ylS5cWvcIOtGvXTl5wwQWoqsrRo0fRdZ1AIMDSpUuLLR8JCQmcvtsqhL3no0WpWzpOSx5efPFFUlNTRefOncXgwYPFO++8I84kVo/TzEWPHj3KxNdo7Nixtl0Xu7RosHnz5kKfaxdA3U7hOFkAdtgpvZ49exb6eif69+9v+3wffvhhUlNTRZcuXcQjjzwiZs6ceUbyNXLkyDxpN998c0TDh3br1o3FixezYMECVqxYwTfffMPKlSvPKM/69evbph88ePCM8s2PUlc6Titj89sfqTg8++yzZT6OstOA68qVKyMmuE2bNi3WIPLJjB07tlAvZ1ECl9kF8wJo0KDBGd27U5Crp59+OqLWo5O8OkUmLA5OLg1nsqbQzm8J7D3TI0WpKp22bdvaOmu9/fbbUbnpF198MU9az549SzUswcmsWrVK2Alpp06dmDRpUkTq6OR0t2zZsiK1d0EDs3Zf/vzYunWrbXphY8XY0aVLF9s2K67fV36kpKSI07vHEA6XG6mZyPXr19umF1extWzZ0na28f333y9WfoWlVJWO05KEsWPHRqU8p+nzsrRmZtSoUcJuHOCJJ54oMOhWYahZs+aZZgE4T7XmUlRflZSUFFulZxfzp7A4WY5jxowpdp754RRZ8G9/+1tE8t+xY4ewC9HSvXt37rvvviLLht1HGOz3AIsktkqnuJvDFRW7NSDz588vMKZJcUlJSRFvvfVWnvSBAweWykJQJ5w8plesWHHGedutaZo9e3aR8/nxxx8ddyR49913Hffsyo958+blSWvTpk2R6wZhnyG7pSazZ8+OWqzgL7/80jbfSC6NsPMkh7B10rdv30LL8OTJk213zIXwxEvxancqmmY/T1Vqu0G89dZbRXLmixROkeH69+8ftTJN0yzS+Zs3b3aMArd48eIzUo65GxSeTEpKSrHycvqyF7f7YjeY7DTmUBBOXufRsqJzcdo26OTwJmfCDz/8IGbOnGl7bMGCBUyePDnfclq3bi0/++wz6dTLiOTuKU5rOG2n+gYOHMi4ceOiusrZKX5JSUTWj2bZdnnfdtttvPnmmxHZRQHCcYdfeumlYtXVLs9evXqd2LgwEvkVtx0HDRokZ82alSe9qPnVq1dP7t+/P0/6woULueqqq85q+SqojFymTZvGunXr+PXXX0lNTaVWrVokJyfbfnRymTNnDp06dYpYHceNGyft9ksrlc32hg4dattgker7FkT79u1t0532ZzpTiuvd6bQSeMqUKcVaIuDkHrBly5aiZnWC0y2Rm2++udh5bdq0yTb9dC/ggnByBp0wYUKR61QcnKzmSAZDL2hBbP/+/Zk0aRLz589n+fLlTJ06NV+Fs2jRoogqHHC28Etl7ZXT9OKUKVNKZEuS3O1iT8du9iESFDdUyNKlS4VTd2Dv3r1Fzs9p5upMxtBOt+DeeeedYufltMtHixYtipSPXQAxgDlz5pSIfL3yyiu25RS0qUBRWLFihShquzixYMEC2rZtG/G2KdJe5tFk4MCBttq+pMNN2Dm4QWS/Rrn4fL5iX/uvf/3LURjmzp1bpLpeffXVxa5HfuTOEg0ZMiQq+Rdl2txphX5+X/lo4BSoPZJ7ZC1btkykpqbaOpUWlpEjR9KuXbuoKONy5crZptsqnUgEV3fCLobHokWLePnll0t047WxY8eK02dLFi9eXOzZklzsAlilp6efUZ6NGjU6sTvG/PnzT7j1V69enbp16xZaiHfs2MGCBQuYNWsWs2fPZv78+RFxjszdCXTEiBFn/AyHDx/Oxx9/zLx58/j4448B2LNnT6Gvb9euXZ60jz76qNhjVsXFyaqJRkTEdu3aibZt2zruoGLHyy+/zCWXXGK7k2mksHM4nTt3LqW6w6LLuUPv3r3lrFmzXHkqZZo1aybbt29P69atqV69Op06dWLx4sUcOXKEvXv38vXXX/Phhx+W6nP6f1w3PIypF6gXAAAAAElFTkSuQmCC'';

async function fetchRep(
  action: string,
  params: Record<string, string>
): Promise<any | null> {
  try {
    const q = new URLSearchParams({ ...params, action, callback: 'cb' }).toString();
    const res = await fetch(`${APPS_SCRIPT_URL}?${q}`);
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/^[^(]*\(([\s\S]*?)\)\s*;?\s*$/);
    if (!match) {
      try {
        const data = JSON.parse(text);
        return data.ok ? data.rep : null;
      } catch {
        return null;
      }
    }
    const data = JSON.parse(match[1]);
    return data.ok ? data.rep : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const pid = searchParams.get('pid');
  const slug = searchParams.get('slug');

  const [rep, font] = await Promise.all([
    pid
      ? fetchRep('get_rep', { pid })
      : slug
      ? fetchRep('get_rep_by_slug', { slug })
      : Promise.resolve(null),
    getFont(),
  ]);

  const name = (rep?.name as string) || 'FARMASI';
  const city = (rep?.city as string) || '';
  const photoUrl = (rep?.photo_url as string) || '';
  const photo = /^https?:\/\//i.test(photoUrl) ? photoUrl : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background:
            'linear-gradient(135deg, #FCE7F3 0%, #FFFFFF 50%, #FCE7F3 100%)',
          padding: 80,
          alignItems: 'center',
          gap: 60,
          fontFamily: 'Noto Serif Georgian',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border: '1px solid #BE185D',
            opacity: 0.15,
            display: 'flex',
          }}
        />

        {photo ? (
          <img
            src={photo}
            width={420}
            height={520}
            style={{
              objectFit: 'cover',
              borderRadius: 12,
              border: '5px solid #E50571',
              boxShadow: '0 20px 60px rgba(229, 5, 113, 0.3)',
            }}
          />
        ) : (
          <div
            style={{
              width: 420,
              height: 520,
              background: '#FCE7F3',
              borderRadius: 12,
              border: '5px solid #E50571',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
            }}
          >
            <img src={LOGO_DATA_URL} width={300} height={126} style={{ objectFit: 'contain' }} />
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 14,
          }}
        >
          <img
            src={LOGO_DATA_URL}
            width={200}
            height={84}
            style={{ objectFit: 'contain', marginBottom: 8 }}
          />

          <div
            style={{
              fontSize: name.length > 14 ? 70 : 90,
              color: '#0F0F0F',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {name}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 12,
            }}
          >
            <div style={{ width: 80, height: 3, background: '#E50571', display: 'flex' }} />
            <div style={{ fontSize: 34, color: '#E50571' }}>
              ნამდვილი ქალისთვის
            </div>
          </div>

          {city && (
            <div style={{ fontSize: 26, color: '#666', marginTop: 20, display: 'flex' }}>
              📍 {city}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Serif Georgian',
          data: font,
          style: 'normal',
          weight: 700,
        },
      ],
      headers: {
        'Cache-Control':
          'public, max-age=3600, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  );
}
