import { _decorator, Component, LabelOutline, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;


export class GameColor  {
  static DEFAULT=`ffffff`
    static GAME_GREEN = `6C862B`
    static GAME_RED = `C0875B`
    /**医生类型描边颜色 */
    static TagColor = [`6f782c`, `d79c2e`, `6091bf`]
    /**医生类型名字颜色 */
    static TypeNameColor = [`71783e`, `d79c2e`, `6091bf`]
    /**状态文字描边 */
    static STATUS_COLOR = [`a78a56`, `6b73a6`, `619d87`, `6084a6`]
    /**条件解锁后的颜色 */
    static CONDICTION_ACHIEVE = `70b7c8`
    /**条件未解锁的颜色 */
    static CONDICTION_NOT_ACHIEVE = `c9985a`

    static ChangeColor(sp: Sprite, colorHex: string) {
        sp.color = sp.color.fromHEX(colorHex)
    }
}


