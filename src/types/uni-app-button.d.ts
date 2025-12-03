/**
 * uni-app Button组件类型扩展
 * 
 * @description 扩展uni-app button组件的type属性，支持primary和warn类型
 * 解决@dcloudio/types类型定义不完整的问题
 * 
 * @author SHENJI Team
 * @date 2025-12-03
 * @version 1.0.0
 * 
 * @example
 * ```vue
 * <template>
 *   <button type="primary">主要按钮</button>
 *   <button type="warn">警告按钮</button>
 * </template>
 * ```
 */

declare namespace UniNamespace {
  /**
   * Button组件type属性类型定义
   * 
   * @description uni-app button支持的所有type类型
   * 包括HTML原生类型和uni-app扩展类型
   */
  type ButtonType = 
    | 'default'   // 默认样式（灰色）
    | 'primary'   // 主要按钮（蓝色）⭐ uni-app扩展
    | 'warn'      // 警告按钮（红色）⭐ uni-app扩展
    | 'button'    // HTML原生
    | 'submit'    // HTML原生
    | 'reset';    // HTML原生

  /**
   * Button组件size属性类型定义
   */
  type ButtonSize = 'default' | 'mini';

  /**
   * Button组件open-type属性类型定义
   */
  type ButtonOpenType = 
    | 'contact'         // 打开客服会话
    | 'share'           // 触发用户转发
    | 'getPhoneNumber'  // 获取用户手机号
    | 'getUserInfo'     // 获取用户信息
    | 'launchApp'       // 打开APP
    | 'openSetting'     // 打开授权设置页
    | 'feedback'        // 打开"意见反馈"页面
    | 'chooseAvatar';   // 获取用户头像

  /**
   * Button组件form-type属性类型定义
   */
  type ButtonFormType = 'submit' | 'reset';

  /**
   * Button组件属性接口
   * 
   * @description 定义button组件的所有可用属性
   * 提供完整的TypeScript类型支持
   */
  interface ButtonProps {
    /**
     * 按钮类型
     * 
     * @description 决定按钮的样式
     * - default: 灰色默认样式
     * - primary: 蓝色主要样式
     * - warn: 红色警告样式
     * 
     * @default 'default'
     */
    type?: ButtonType;
    
    /**
     * 按钮大小
     * 
     * @description 
     * - default: 默认大小
     * - mini: 小尺寸
     * 
     * @default 'default'
     */
    size?: ButtonSize;
    
    /**
     * 是否镂空
     * 
     * @description 设置为true时显示边框，背景透明
     * @default false
     */
    plain?: boolean;
    
    /**
     * 是否禁用
     * 
     * @description 禁用后按钮变灰且不可点击
     * @default false
     */
    disabled?: boolean;
    
    /**
     * 是否显示加载图标
     * 
     * @description 设置为true时显示loading图标
     * @default false
     */
    loading?: boolean;
    
    /**
     * 表单类型
     * 
     * @description 用于form组件，点击分别会触发form的submit/reset事件
     */
    formType?: ButtonFormType;
    
    /**
     * 开放能力
     * 
     * @description 微信小程序的开放能力
     */
    openType?: ButtonOpenType;
    
    /**
     * 指定按钮按下去的样式类
     * 
     * @description 当hover-class="none"时，没有点击态效果
     * @default 'button-hover'
     */
    hoverClass?: string;
    
    /**
     * 按住后多久出现点击态
     * 
     * @description 单位毫秒
     * @default 20
     */
    hoverStartTime?: number;
    
    /**
     * 手指松开后点击态保留时间
     * 
     * @description 单位毫秒
     * @default 70
     */
    hoverStayTime?: number;

    /**
     * 指定返回用户信息的语言
     * 
     * @description 
     * - en: 英文
     * - zh_CN: 简体中文
     * - zh_TW: 繁体中文
     * 
     * @default 'en'
     */
    lang?: 'en' | 'zh_CN' | 'zh_TW';

    /**
     * 会话来源
     * 
     * @description open-type="contact"时有效
     */
    sessionFrom?: string;

    /**
     * 会话内消息卡片标题
     * 
     * @description open-type="contact"时有效
     * @default 当前标题
     */
    sendMessageTitle?: string;

    /**
     * 会话内消息卡片点击跳转小程序路径
     * 
     * @description open-type="contact"时有效
     * @default 当前分享路径
     */
    sendMessagePath?: string;

    /**
     * 会话内消息卡片图片
     * 
     * @description open-type="contact"时有效
     * @default 截图
     */
    sendMessageImg?: string;

    /**
     * 显示会话内消息卡片
     * 
     * @description open-type="contact"时有效
     * @default false
     */
    showMessageCard?: boolean;

    /**
     * 打开APP时，向APP传递的参数
     * 
     * @description open-type="launchApp"时有效
     */
    appParameter?: string;

    /**
     * 是否显示透明背景
     * 
     * @default false
     */
    transparent?: boolean;

    /**
     * 指定是否阻止本节点的祖先节点出现点击态
     * 
     * @default false
     */
    'hover-stop-propagation'?: boolean;
  }

  /**
   * Button组件事件接口
   */
  interface ButtonEvents {
    /** 点击事件 */
    onClick?: (event: any) => void;
    
    /** 用户点击该按钮时，会返回获取到的用户信息 */
    onGetuserinfo?: (event: any) => void;
    
    /** 客服消息回调 */
    onContact?: (event: any) => void;
    
    /** 获取用户手机号回调 */
    onGetphonenumber?: (event: any) => void;
    
    /** 当使用开放能力时，发生错误的回调 */
    onError?: (event: any) => void;
    
    /** 在打开授权设置页后回调 */
    onOpensetting?: (event: any) => void;
    
    /** 打开APP成功的回调 */
    onLaunchapp?: (event: any) => void;
    
    /** 获取用户头像回调 */
    onChooseavatar?: (event: any) => void;
  }
}

// ========================================
// 全局类型增强
// ========================================

declare global {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * uni-app Button组件
       * 
       * @description 按钮组件，用于触发操作
       * 
       * @example
       * ```vue
       * <template>
       *   <!-- 基本用法 -->
       *   <button type="primary">主要按钮</button>
       *   <button type="warn">警告按钮</button>
       *   <button type="default">默认按钮</button>
       *   
       *   <!-- 禁用状态 -->
       *   <button type="primary" disabled>禁用按钮</button>
       *   
       *   <!-- 加载状态 -->
       *   <button type="primary" loading>加载中...</button>
       *   
       *   <!-- 镂空按钮 -->
       *   <button type="primary" plain>镂空按钮</button>
       *   
       *   <!-- 小尺寸 -->
       *   <button type="primary" size="mini">小按钮</button>
       *   
       *   <!-- 表单提交 -->
       *   <form>
       *     <button form-type="submit">提交</button>
       *     <button form-type="reset">重置</button>
       *   </form>
       * </template>
       * ```
       * 
       * @see https://uniapp.dcloud.net.cn/component/button.html
       */
      button: UniNamespace.ButtonProps & UniNamespace.ButtonEvents;
    }
  }
}

// 导出类型供其他文件使用
export type { UniNamespace };
