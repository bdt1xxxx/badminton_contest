Page({
  data: {
    userInfo: {
      nickname: '匿名',
      avatar: '/images/profile.png'
    },
    hasUserInfo: false
  },

  onLoad: function() {
    this.getUserProfile();
  },

  onShow: function() {
    this.getUserProfile();
  },

  // 获取用户信息
  getUserProfile: function() {
    // 检查是否已经授权
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，获取用户信息
          this.getUserInfo();
        } else {
          // 未授权，显示获取用户信息按钮
          this.setData({
            userInfo: {
              nickname: '匿名',
              avatar: '/images/profile.png'
            },
            hasUserInfo: false
          });
        }
      }
    });
  },

  // 获取用户信息
  getUserInfo: function() {
    wx.getUserInfo({
      success: (res) => {
        const userInfo = {
          nickname: res.userInfo.nickName || '匿名',
          avatar: res.userInfo.avatarUrl || '/images/profile.png'
        };
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
        
        // 保存到本地存储
        try {
          wx.setStorageSync('userInfo', userInfo);
        } catch (e) {
          console.error('保存用户信息失败:', e);
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        // 获取失败时使用默认值
        this.setData({
          userInfo: {
            nickname: '匿名',
            avatar: '/images/profile.png'
          },
          hasUserInfo: false
        });
      }
    });
  },

  // 导入数据
  importData: function() {
    // 直接显示导入对话框
    this.showImportDialog();
  },

  // 显示导入对话框
  showImportDialog: function() {
    wx.showModal({
      title: '导入数据',
      content: '',
      editable: true,
      placeholderText: '请粘贴比赛数据',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          this.processImportData(res.content.trim());
        }
      }
    });
  },

  // 显示数据格式示例
  showDataFormatExample: function() {
    const exampleData = [
      {
        "id": 1703123456789,
        "name": "示例比赛",
        "date": "2023-12-20",
        "time": "14:00",
        "location": "羽毛球馆",
        "type": "双打",
        "maxPlayers": 8,
        "players": [
          {"id": 1, "name": "张三", "score": 3.5},
          {"id": 2, "name": "李四", "score": 4.0},
          {"id": 3, "name": "王五", "score": 3.0},
          {"id": 4, "name": "赵六", "score": 4.5}
        ],
        "levelGap": 2,
        "rounds": 4,
        "status": "报名中",
        "createTime": "2023-12-20T10:00:00.000Z",
        "matches": [],
        "playerCounts": {},
        "byeCounts": {}
      }
    ];
    
    // 压缩示例数据
    const compressedExample = this.compressData(exampleData);
    const base64Example = this.arrayBufferToBase64(compressedExample);
    
    const originalLength = JSON.stringify(exampleData).length;
    const compressedLength = base64Example.length;
    const compressionRatio = ((1 - compressedLength / originalLength) * 100).toFixed(1);
    
    wx.showModal({
      title: '数据格式示例',
      content: `原始数据长度: ${originalLength} 字符\n压缩后长度: ${compressedLength} 字符\n压缩率: ${compressionRatio}%\n\n以下是压缩后的base64数据，您可以复制使用：`,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '复制示例',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: base64Example,
            success: () => {
              wx.showToast({
                title: '压缩示例数据已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 处理导入的数据
  processImportData: function(dataStr) {
    try {
      let data;
      let dataType = '';
      
      // 检查是否为base64格式
      if (this.isBase64(dataStr)) {
        try {
          // 解码base64
          const arrayBuffer = this.base64ToArrayBuffer(dataStr);
          
          // 解压数据
          const decompressedString = this.decompressData(arrayBuffer);
          
          // 解析JSON
          data = JSON.parse(decompressedString);
          dataType = '压缩数据';
        } catch (e) {
          console.error('处理压缩数据失败:', e);
          wx.showToast({
            title: '压缩数据格式错误',
            icon: 'none'
          });
          return;
        }
      } else {
        try {
          // 尝试直接解析JSON（可能是原始数据或压缩数据）
          data = JSON.parse(dataStr);
          
          // 检查是否为压缩格式（通过检查是否包含压缩键名）
          const hasCompressedKeys = data.some(item => 
            item.i || item.n || item.d || item.y || item.p || item.s
          );
          
          if (hasCompressedKeys) {
            // 这是压缩格式的数据，需要解压
            dataType = '压缩JSON';
            data = data.map(item => this.decompressMatchData(item));
          } else {
            dataType = '原始数据';
          }
        } catch (e) {
          console.error('解析JSON失败:', e);
          wx.showToast({
            title: '数据格式错误，请检查JSON格式',
            icon: 'none'
          });
          return;
        }
      }
      
      // 验证数据格式
      if (Array.isArray(data)) {
        // 验证每个比赛对象的结构
        const validMatches = [];
        const invalidMatches = [];
        
        data.forEach((match, index) => {
          if (this.validateMatchData(match)) {
            // 为导入的数据添加导入时间戳
            match.importTime = new Date().toISOString();
            validMatches.push(match);
          } else {
            invalidMatches.push({ index, match });
          }
        });
        
        if (validMatches.length === 0) {
          wx.showToast({
            title: '没有有效的数据',
            icon: 'none'
          });
          return;
        }
        
        // 获取现有的比赛数据
        const existingMatches = wx.getStorageSync('matches') || [];
        
        // 合并新数据到现有数据中
        const allMatches = [...existingMatches, ...validMatches];
        
        // 保存到本地存储
        wx.setStorageSync('matches', allMatches);
        
        // 显示导入结果
        wx.showToast({
          title: `导入成功，共${validMatches.length}条记录`,
          icon: 'success',
          duration: 2000
        });
        
        // 延迟跳转到比赛列表页面
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/match-list/match-list'
          });
        }, 1000);
      } else {
        wx.showToast({
          title: '数据格式错误：应为数组格式',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error('处理导入数据失败:', e);
      wx.showToast({
        title: '数据格式错误或解码失败',
        icon: 'none'
      });
    }
  },

  // 解压单个比赛数据对象
  decompressMatchData: function(match) {
    try {
      // 创建解压后的对象
      const decompressed = {};
      
      // 解压键名
      if (match.i) decompressed.id = match.i;
      if (match.n) decompressed.name = match.n;
      if (match.d) decompressed.date = match.d;
      if (match.t) decompressed.time = match.t;
      if (match.y) decompressed.type = match.y;
      if (match.p) decompressed.players = match.p;
      if (match.s) decompressed.status = match.s;
      if (match.c) decompressed.createTime = match.c;
      if (match.m) decompressed.matches = match.m;
      if (match.pc) decompressed.playerCounts = match.pc;
      if (match.bc) decompressed.byeCounts = match.bc;
      if (match.mp) decompressed.maxPlayers = match.mp;
      if (match.lg) decompressed.levelGap = match.lg;
      if (match.r) decompressed.rounds = match.r;
      if (match.l) decompressed.location = match.l;
      if (match.sc) decompressed.score = match.sc;
      if (match.it) decompressed.importTime = match.it;
      
      // 解压状态值
      if (decompressed.status === '1') decompressed.status = '报名中';
      if (decompressed.status === '2') decompressed.status = '进行中';
      if (decompressed.status === '3') decompressed.status = '已结束';
      
      // 解压类型值
      if (decompressed.type === 's') decompressed.type = '单打';
      if (decompressed.type === 'd') decompressed.type = '双打';
      if (decompressed.location === 'p') decompressed.location = '待定';
      
      // 解压时间格式
      if (decompressed.date && decompressed.date.length === 8) {
        decompressed.date = `${decompressed.date.slice(0, 4)}-${decompressed.date.slice(4, 6)}-${decompressed.date.slice(6, 8)}`;
      }
      if (decompressed.time && decompressed.time.length === 4) {
        decompressed.time = `${decompressed.time.slice(0, 2)}:${decompressed.time.slice(2, 4)}`;
      }
      
      return decompressed;
    } catch (e) {
      console.error('解压比赛数据失败:', e);
      return match; // 如果解压失败，返回原始数据
    }
  },

  // 验证比赛数据格式
  validateMatchData: function(match) {
    // 检查必需的字段（支持原始键名和压缩键名）
    const requiredFields = [
      { original: 'id', compressed: 'i' },
      { original: 'name', compressed: 'n' },
      { original: 'date', compressed: 'd' },
      { original: 'type', compressed: 'y' },
      { original: 'players', compressed: 'p' },
      { original: 'status', compressed: 's' }
    ];
    
    for (const field of requiredFields) {
      if (!match.hasOwnProperty(field.original) && !match.hasOwnProperty(field.compressed)) {
        console.warn(`比赛数据缺少必需字段: ${field.original} 或 ${field.compressed}`, match);
        return false;
      }
    }
    
    // 获取字段值（优先使用原始键名，如果没有则使用压缩键名）
    const getName = () => match.name || match.n;
    const getPlayers = () => match.players || match.p;
    const getStatus = () => match.status || match.s;
    
    // 检查字段类型
    const name = getName();
    if (typeof name !== 'string' || !name.trim()) {
      console.warn('比赛名称无效:', name);
      return false;
    }
    
    const players = getPlayers();
    if (!Array.isArray(players) || players.length === 0) {
      console.warn('参赛选手数据无效:', players);
      return false;
    }
    
    const status = getStatus();
    if (typeof status !== 'string' || !['报名中', '进行中', '已结束', '1', '2', '3'].includes(status)) {
      console.warn('比赛状态无效:', status);
      return false;
    }
    
    return true;
  },

  // 清除数据
  clearData: function() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有比赛数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('matches');
            
            wx.showToast({
              title: '数据已清除',
              icon: 'success'
            });
          } catch (e) {
            wx.showToast({
              title: '清除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 压缩数据
  compressData: function(data) {
    try {
      // 将数据转换为JSON字符串
      const jsonString = JSON.stringify(data);
      
      // 更激进的压缩算法
      let compressed = jsonString
        .replace(/\s+/g, '') // 移除所有空白字符（包括换行符、空格、制表符）
        // 超短键名映射
        .replace(/"name"/g, '"n"')
        .replace(/"date"/g, '"d"')
        .replace(/"time"/g, '"t"')
        .replace(/"type"/g, '"y"')
        .replace(/"players"/g, '"p"')
        .replace(/"status"/g, '"s"')
        .replace(/"createTime"/g, '"c"')
        .replace(/"matches"/g, '"m"')
        .replace(/"playerCounts"/g, '"pc"')
        .replace(/"byeCounts"/g, '"bc"')
        .replace(/"id"/g, '"i"')
        .replace(/"maxPlayers"/g, '"mp"')
        .replace(/"levelGap"/g, '"lg"')
        .replace(/"rounds"/g, '"r"')
        .replace(/"location"/g, '"l"')
        .replace(/"score"/g, '"sc"')
        .replace(/"importTime"/g, '"it"')
        // 数值压缩
        .replace(/"报名中"/g, '"1"')
        .replace(/"进行中"/g, '"2"')
        .replace(/"已结束"/g, '"3"')
        .replace(/"单打"/g, '"s"')
        .replace(/"双打"/g, '"d"')
        .replace(/"待定"/g, '"p"')
        // 移除默认值
        .replace(/"m":\[\]/g, '"m":[]')
        .replace(/"pc":\{\}/g, '"pc":{}')
        .replace(/"bc":\{\}/g, '"bc":{}')
        // 压缩时间格式
        .replace(/(\d{4})-(\d{2})-(\d{2})/g, '$1$2$3')
        .replace(/(\d{2}):(\d{2})/g, '$1$2');
      
      // 应用高级压缩：移除重复的引号和冒号
      compressed = this.advancedCompression(compressed);
      
      // 转换为Uint8Array
      const encoder = new TextEncoder();
      return encoder.encode(compressed);
    } catch (e) {
      console.error('压缩数据失败:', e);
      throw new Error('数据压缩失败');
    }
  },

  // 高级压缩算法
  advancedCompression: function(str) {
    try {
      // 移除重复的引号和冒号模式
      let result = str;
      
      // 压缩常见的JSON模式
      result = result
        .replace(/\[\]/g, '[]')  // 空数组
        .replace(/\{\}/g, '{}')  // 空对象
        .replace(/,\s*}/g, '}')  // 移除对象末尾的逗号
        .replace(/,\s*]/g, ']')  // 移除数组末尾的逗号
        .replace(/:\s*/g, ':')   // 移除冒号后的空格
        .replace(/\s*:/g, ':');  // 移除冒号前的空格
      
      return result;
    } catch (e) {
      console.error('高级压缩失败:', e);
      return str; // 如果高级压缩失败，返回原始压缩结果
    }
  },

  // 解压数据
  decompressData: function(compressedData) {
    try {
      // 将Uint8Array转换为字符串
      const decoder = new TextDecoder();
      const compressedString = decoder.decode(compressedData);
      
      // 解压缩：恢复所有压缩的内容
      let decompressed = compressedString
        // 恢复键名
        .replace(/"n"/g, '"name"')
        .replace(/"d"/g, '"date"')
        .replace(/"t"/g, '"time"')
        .replace(/"y"/g, '"type"')
        .replace(/"p"/g, '"players"')
        .replace(/"s"/g, '"status"')
        .replace(/"c"/g, '"createTime"')
        .replace(/"m"/g, '"matches"')
        .replace(/"pc"/g, '"playerCounts"')
        .replace(/"bc"/g, '"byeCounts"')
        .replace(/"i"/g, '"id"')
        .replace(/"mp"/g, '"maxPlayers"')
        .replace(/"lg"/g, '"levelGap"')
        .replace(/"r"/g, '"rounds"')
        .replace(/"l"/g, '"location"')
        .replace(/"sc"/g, '"score"')
        .replace(/"it"/g, '"importTime"')
        // 恢复状态值
        .replace(/"1"/g, '"报名中"')
        .replace(/"2"/g, '"进行中"')
        .replace(/"3"/g, '"已结束"')
        // 恢复类型值
        .replace(/"s"/g, '"单打"')
        .replace(/"d"/g, '"双打"')
        .replace(/"p"/g, '"待定"')
        // 恢复时间格式
        .replace(/(\d{4})(\d{2})(\d{2})/g, '$1-$2-$3')
        .replace(/(\d{2})(\d{2})/g, '$1:$2');
      
      // 恢复高级压缩的内容
      decompressed = this.advancedDecompression(decompressed);
      
      return decompressed;
    } catch (e) {
      console.error('解压数据失败:', e);
      throw new Error('数据解压失败');
    }
  },

  // 高级解压算法
  advancedDecompression: function(str) {
    try {
      let result = str;
      
      // 清理可能的重复引号
      result = result
        .replace(/""/g, '"')  // 移除重复的引号
        .replace(/,,/g, ','); // 移除重复的逗号
      
      return result;
    } catch (e) {
      console.error('高级解压失败:', e);
      return str; // 如果高级解压失败，返回原始解压结果
    }
  },

  // ArrayBuffer转Base64
  arrayBufferToBase64: function(buffer) {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      // 使用微信小程序兼容的base64编码
      return this.stringToBase64(binary);
    } catch (e) {
      console.error('转换为Base64失败:', e);
      throw new Error('Base64编码失败');
    }
  },

  // Base64转ArrayBuffer
  base64ToArrayBuffer: function(base64) {
    try {
      // 使用微信小程序兼容的base64解码
      const binaryString = this.base64ToString(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      console.error('Base64解码失败:', e);
      throw new Error('Base64解码失败');
    }
  },

  // 字符串转Base64（微信小程序兼容）
  stringToBase64: function(str) {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      
      while (i < str.length) {
        const char1 = str.charCodeAt(i++);
        const char2 = i < str.length ? str.charCodeAt(i++) : NaN;
        const char3 = i < str.length ? str.charCodeAt(i++) : NaN;
        
        const enc1 = char1 >> 2;
        const enc2 = ((char1 & 3) << 4) | (char2 >> 4);
        let enc3 = ((char2 & 15) << 2) | (char3 >> 6);
        let enc4 = char3 & 63;
        
        if (isNaN(char2)) {
          enc3 = 64;
          enc4 = 64;
        } else if (isNaN(char3)) {
          enc4 = 64;
        }
        
        result += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
      }
      
      return result;
    } catch (e) {
      console.error('字符串转Base64失败:', e);
      throw new Error('Base64编码失败');
    }
  },

  // Base64转字符串（微信小程序兼容）
  base64ToString: function(base64Str) {
    try {
      const cleanBase64 = base64Str.replace(/=+$/, '');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      
      while (i < cleanBase64.length) {
        const enc1 = chars.indexOf(cleanBase64.charAt(i++));
        const enc2 = chars.indexOf(cleanBase64.charAt(i++));
        const enc3 = chars.indexOf(cleanBase64.charAt(i++));
        const enc4 = chars.indexOf(cleanBase64.charAt(i++));
        
        const char1 = (enc1 << 2) | (enc2 >> 4);
        const char2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const char3 = ((enc3 & 3) << 6) | enc4;
        
        result += String.fromCharCode(char1);
        if (enc3 !== 64) result += String.fromCharCode(char2);
        if (enc4 !== 64) result += String.fromCharCode(char3);
      }
      
      return result;
    } catch (e) {
      console.error('Base64转字符串失败:', e);
      throw new Error('Base64解码失败');
    }
  },

  // 检查字符串是否为base64格式
  isBase64: function(str) {
    try {
      // 检查是否只包含base64字符
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(str) && str.length > 0;
    } catch (e) {
      return false;
    }
  },

  // 导出数据
  exportData: function() {
    try {
      const matches = wx.getStorageSync('matches') || [];
      
      if (matches.length === 0) {
        wx.showToast({
          title: '暂无数据可导出',
          icon: 'none'
        });
        return;
      }
      
      // 尝试导出压缩数据，如果失败则导出原始数据
      this.tryExportCompressedData(matches);
    } catch (e) {
      console.error('导出失败:', e);
      wx.showToast({
        title: '导出失败，请重试',
        icon: 'none'
      });
    }
  },

  // 尝试导出压缩数据
  tryExportCompressedData: function(matches) {
    try {
      // 压缩数据
      const compressedData = this.compressData(matches);
      
      // 检查压缩后的数据长度
      const compressedString = new TextDecoder().decode(compressedData);
      const originalLength = JSON.stringify(matches).length;
      const compressedLength = compressedString.length;
      
      // 如果压缩后数据仍然很长，直接导出压缩的JSON
      if (compressedLength > 1000) {
        console.log('压缩后数据仍然很长，直接导出压缩JSON');
        this.exportCompressedJSON(compressedString, matches);
        return;
      }
      
      // 转换为base64
      const base64Data = this.arrayBufferToBase64(compressedData);
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: base64Data,
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success',
            duration: 1000
          });
        },
        fail: (err) => {
          console.error('复制到剪贴板失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none',
            duration: 1000
          });
        }
      });
    } catch (e) {
      console.error('导出压缩数据失败:', e);
      console.log('尝试导出原始数据...');
      
      // 压缩失败，尝试导出原始数据
      this.exportRawData(matches);
    }
  },

  // 导出压缩的JSON（不进行base64编码）
  exportCompressedJSON: function(compressedString, matches) {
    try {
      // 复制到剪贴板
      wx.setClipboardData({
        data: compressedString,
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success',
            duration: 1000
          });
        },
        fail: (err) => {
          console.error('复制到剪贴板失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none',
            duration: 1000
          });
        }
      });
    } catch (e) {
      console.error('导出压缩JSON失败:', e);
      // 如果压缩JSON也失败，尝试导出原始数据
      this.exportRawData(matches);
    }
  },

  // 导出原始数据
  exportRawData: function(matches) {
    try {
      const jsonData = JSON.stringify(matches, null, 2);
      
      // 复制到剪贴板
      wx.setClipboardData({
        data: jsonData,
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success',
            duration: 1000
          });
        },
        fail: (err) => {
          console.error('复制到剪贴板失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none',
            duration: 1000
          });
        }
      });
    } catch (e) {
      console.error('导出原始数据失败:', e);
      wx.showToast({
        title: '导出失败',
        icon: 'none',
        duration: 1000
      });
    }
  }
}); 