
export class EventManager{

    public dict: any={};

    public static Instance:EventManager=new EventManager();
    
    /**

     * 添加消息监听

     * @param type 消息唯一标识

     * @param listener 侦听函数

     * @param listenerObj 侦听函数所属对象

     *

     */

    public addListener(type: string, listener: Function, listenerObj: any): void {

        var arr: Array<any> = this.dict[type];

        if (arr == null) {

            arr = new Array<any>();

            this.dict[type] = arr;

        }

        //检测是否已经存在

        var i: number = 0;

        var len: number = arr.length;

        for (i; i < len; i++) {

            if (arr[i][0] == listener && arr[i][1] == listenerObj) {

                return;

            }

        }

        arr.push([listener, listenerObj]);

    }

    /**

     * 移除消息监听

     * @param type 消息唯一标识

     * @param listener 侦听函数

     * @param listenerObj 侦听函数所属对象

     */

    public removeListener(type: string, listener: Function, listenerObj: any): void {

        var arr: Array<any> = this.dict[type];

        if (arr == null) {

            return;

        }

        var i: number = 0;

        var len: number = arr.length;

        for (i; i < len; i++) {

            if (arr[i][0] == listener && arr[i][1] == listenerObj) {

                arr.splice(i, 1);

                break;

            }

        }

        if (arr.length == 0) {

            this.dict[type] = null;

            delete this.dict[type];

        }

    }

    /**

     * 移除某一对象的所有监听

     * @param listenerObj 侦听函数所属对象

     */

    public removeAll(listenerObj: any): void {

        var keys = Object.keys(this.dict);

        for (var i: number = 0, len = keys.length; i < len; i++) {

            var type = keys[i];

            var arr: Array<any> = this.dict[type];

            for (var j = 0; j < arr.length; j++) {

                if (arr[j][1] == listenerObj) {

                    arr.splice(j, 1);

                    j--;

                }

            }

            if (arr.length == 0) {

                this.dict[type] = null;

                delete this.dict[type];

            }

        }

    }

    /**

     * 触发消息

     * @param type 消息唯一标识

     * @param param 消息参数

     *

     */

    public dispatch(type: string, ...param: any): void {

        if (this.dict[type] == null) {

            return;

        }

        this.dealMsg(type,undefined,param);

    }

       /**

     * 触发指定对象的消息

     * @param type 消息唯一标识

     * @param param 消息参数

     *

     */

    public dispatchObj(type: string,listenerObj: any, ...param: any): any {

        if (this.dict[type] == null) {

            return;

        }

       return this.dealMsg(type,listenerObj,...param);

    }

     /**

     * 处理一条消息

     */

    private dealMsg(type: string,listenerObj: any, ...param: any): any {

        var listeners: Array<any> = this.dict[type];

        var i: number = 0;

        var len: number = listeners.length;

        var listener: Array<any> = null as unknown as Array<any>;

        let res;

        while (i < len) {

            listener = listeners[i];

            // console.log('listenerObj='+listenerObj+'，listener[1]='+listener[1])

            if(!listenerObj || (listenerObj && listenerObj == listener[1])){  //派发

                res=listener[0].apply(listener[1], ...param);

            }

            if (listeners.length != len) {

                len = listeners.length;

                i--;

            } 

            i++;

        }

        return res;

    }

}