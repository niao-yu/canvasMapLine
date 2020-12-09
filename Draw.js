(function(){
  class Draw {
    constructor(allOptions) {
      const { dom, imgUrl, ...options } = allOptions
      this.boxDom = dom
      this.configs = Object.assign(this.configs, options)
      // 按照比例，配置一下尺寸参数
      this.configs.flashRadiusFrom = this.configs.flashRadiusFrom * this.canvas.scale_line
      this.configs.flashRadiusTo = this.configs.flashRadiusTo * this.canvas.scale_line
      this.configs.lineWidth = this.configs.lineWidth * this.canvas.scale_line
      // 设置发射点的半径
      this.radiiFrom = this.configs.flashRadiusFrom / 10
      this.radiiTo = this.configs.flashRadiusTo / 10
      
      return new Promise((resolve, reject) => {
        // 初始化图片和canvas
        this.initDom(imgUrl).then(imgDom => {
          // 先画出图片
          requestAnimationFrame(() => {
            if (imgDom) this.canvas.ctx.drawImage(imgDom, 0, 0, this.canvas.width, this.canvas.height)
            // 开始循环绘制
            this.drawOne()
            resolve(this)
          })
        }).catch(reject)
      })
    }
    drawNumber = 0 // canvas 绘制次数
    drawDocId = 1 // 射线id累计
    exchangesArc = [] // 每次绘制时, 需要绘制的闪烁们
    handleArr = [] // 每次绘制时, 需要绘制的射线们
    radiiFrom= 0 // 发射点的半径
    radiiTo = 0 // 发射点的半径
    // 生成的 canvas 的信息
    canvas = {
      ctx: null,
      ctx_line: null,
      ctx_circle: null,
      width: 0,
      height: 0,
      width_line: 0,
      height_line: 0,
      width_circle: 0,
      height_circle: 0,
      scale: 2, // 放大比例(防canvas的模糊)
      scale_circle: 1.2, // 放大比例(防canvas的模糊)
      scale_line: 1.2, // 放大比例(防canvas的模糊)
    }
  
    configs = {
      flashRadiusFrom: 10, // 发出时闪烁的圆圈的半径
      flashRadiusTo: 30, // 落地时闪烁的圆圈的半径
      flashSpeed: 0.3, // 闪烁的圆圈的闪烁速度
      flashColorFrom: 'rgba(114,187,214,1)', // 闪烁的圆圈的颜色——from
      flashColorTo: 'rgba(114,187,214,1)', // 闪烁的圆圈的颜色——to
      lineColor: 'rgba(114,187,214,1)', // 射出的线的颜色
      lineWidth: 1.5, // 射出的线的宽度
      lineSpeed: 0.5, // 射出的线的速度
    }
  
    // 发射一条线
    sendLine(from, to) {
      let fromPosition = from.map(v => v / 100), toPosition = to.map(v => v / 100), _this = this
      { // 拿到了两个点，去发射
        // 发射之前先闪烁一下
        let fromReal_x = fromPosition[0] * this.canvas.width_circle
        let fromReal_y = fromPosition[1] * this.canvas.height_circle
        const { flashRadiusFrom, flashRadiusTo, flashColorFrom, flashColorTo } = this.configs
        // 发射
        this.exchangesArc.push(this.getOneArc({x: fromReal_x, y: fromReal_y, r: flashRadiusFrom, color: flashColorFrom}))
        let oneLine = this.oneHandle({
          start_x: fromPosition[0],
          start_y: fromPosition[1],
          end_x: toPosition[0],
          end_y: toPosition[1],
          callback: () => {
            let _x = toPosition[0] * this.canvas.width_circle
            let _y = toPosition[1] * this.canvas.height_circle
            // 终点闪烁一下
            this.exchangesArc.push(this.getOneArc({x: _x, y: _y, r: flashRadiusTo, color: flashColorTo}))
          },
        })
        this.handleArr.push(oneLine)
      }
    }
    // 绘制一次
    drawOne() {
      this.drawNumber++
      { // 整一下 射线line
        if (this.drawNumber % 10 === 0) {
          const ctx_line = this.canvas.ctx_line
          let imgData = ctx_line.getImageData(0, 0, this.canvas.width_line, this.canvas.height_line)
          for (let i = 0, len = imgData.data.length; i < len; i += 4) {
            // 改变每个像素的透明度, 都黯淡一点,且最终透明度为0, 则为
            if (imgData.data[i + 3] === 0) continue
            else if (imgData.data[i + 3] <= 30) imgData.data[i+3] = 0
            else imgData.data[i + 3] *= 0.7
          }
          ctx_line.putImageData(imgData, 0, 0)
        }
      }
      // 绘制其他一些东西
      // if (this.otherDrawArr && Array.isArray(this.otherDrawArr) && this.otherDrawArr.length) {
      //   this.otherDrawArr.forEach(v => v.fn())
      // }
      // 每次绘制的闪烁
      if (this.exchangesArc.length) {
        this.exchangesArc.forEach(v => v.fn())
      }
      // 每次绘制的射线
      if (this.handleArr.length) {
        this.handleArr.forEach(v => v.fn())
      }
      // 循环绘制
      requestAnimationFrame(this.drawOne.bind(this))
    }
  
    // 获取一个闪烁圈对象
    getOneArc({x, y, r, color}) {
      let _this = this
      return {
        startNumber: _this.drawNumber,
        position: {
          x,
          y,
        },
        flag: 0,
        fn() {
          const exchangesArcObj = this
          if (!exchangesArcObj._id) exchangesArcObj._id = _this.drawDocId++ // 配置id
          let _r = exchangesArcObj.flag++ * _this.configs.flashSpeed
          // 判断是否完成
          if (_r >= r) {
            for (let i = 0; i < _this.exchangesArc.length; i++) {
              if (_this.exchangesArc[i]._id === exchangesArcObj._id) {
                _this.exchangesArc.splice(i, 1)
                break
              }
            }
            return
          }
          _this.drawArc({x: exchangesArcObj.position.x, y: exchangesArcObj.position.y}, _r, color)
        },
      }
    }
  
    // 绘制圆 - 扩圈
    drawArc({x, y}, r, color) {
      // 绘制圆，从起点到终点
      const ctx_line = this.canvas.ctx_line
      ctx_line.moveTo(x, y);
      ctx_line.beginPath();
      ctx_line.strokeStyle = color
      ctx_line.arc(x, y, r, 0 * Math.PI / 180, 360 * Math.PI / 180)
      ctx_line.stroke();
      ctx_line.closePath();
    }
  
    // 返回一个射点对象
    oneHandle({ start_x, start_y, end_x, end_y, callback }) {
      let _this = this
      // 计算绘制频率, 结果 (1 / 60) <= drawTimeSpace <= (1 / 200), 分母越小,线越快,点点越明显
      let space = (end_x - start_x) ** 2 + (end_y - start_y) ** 2
      let drawTimeSpace_temp = 60 + (200 - 60) / 2 * space
      let drawTimeSpace = 1 / drawTimeSpace_temp
      return {
        startNumber: _this.drawNumber,
        start: { // 都是百分比
          x: start_x,
          y: start_y,
        },
        end: { // 都是百分比
          x: end_x,
          y: end_y,
        },
        flag: 0,
        fn() {
          const handleObj = this
          if (!handleObj._id) handleObj._id = _this.drawDocId++ // 配置id
          let timeNow = handleObj.flag++ * drawTimeSpace * _this.configs.lineSpeed
          let timeLast = timeNow - (drawTimeSpace * _this.configs.lineSpeed) / 3 * 1
          let timeLastLast = timeNow - (drawTimeSpace * _this.configs.lineSpeed) / 3 * 2
          if (!handleObj._obj) handleObj._obj = _this.computed_obj(handleObj)
          let needStop = timeNow >= 1
          if (needStop) {
            callback && callback()
            for (let i = 0; i < _this.handleArr.length; i++) {
              if (_this.handleArr[i]._id === handleObj._id) {
                _this.handleArr.splice(i, 1)
                break
              }
            }
            return
          }
          let docNow = _this.get_bezier_dot(timeNow, handleObj._obj)
          let docLast = _this.get_bezier_dot(timeLast, handleObj._obj)
          let docLastLast = _this.get_bezier_dot(timeLastLast, handleObj._obj)
          handleObj.flag >= 3 && _this.draw_ball(docLastLast)
          handleObj.flag >= 2 && _this.draw_ball(docLast)
          _this.draw_ball(docNow)
        },
      }
    }
    
    // 计算，把百分比的起始点转一下
    computed_obj(handleObj) {
      const { canvas } = this
      const { start, end } = handleObj
      let start_x = start.x * canvas.width_line
      let start_y = start.y * canvas.height_line
      let end_x = end.x * canvas.width_line
      let end_y = end.y * canvas.height_line
      let center = {
        x: (end_x + start_x) / 2,
        y: (end_y + start_y) / 2,
      }
      let xAbs = center.x * 0.1 // 起点和终点的y轴差的20%
      let yAbs = Math.abs(center.y) * 0.2 // 起点和终点的y轴差的20%
      let control_x = center.x + xAbs
      let control_y = center.y - yAbs
      return {
        start_x,
        start_y,
        control_x,
        control_y,
        end_x,
        end_y,
      }
    }
    
    // 利用贝塞尔曲线公式计算出曲线上某点坐标
    get_bezier_dot(t, {start_x, start_y, control_x, control_y, end_x, end_y}){
      let x = (1-t)*(1-t) * start_x + 2*t*(1-t) * control_x + t*t * end_x;
      let y = (1-t)*(1-t) * start_y + 2*t*(1-t) * control_y + t*t * end_y;
      return { x, y }
    }
    
    // 绘制射线的一个圆点
    draw_ball({x, y}) {
      const { ctx_line } = this.canvas
      ctx_line.beginPath();
      ctx_line.fillStyle = this.configs.lineColor
      ctx_line.arc(x, y, this.configs.lineWidth / 2, 0, Math.PI * 2);
      ctx_line.fill();
      ctx_line.closePath();
    }
    
    // 初始化图片和canvas
    initDom(imgUrl) {
      return new Promise((resolve, reject) => {
        const { canvas } = this
  
        // 获取父盒子尺寸
        let width = this.boxDom.offsetWidth
        let height = this.boxDom.offsetHeight
  
        // 根据新的计算出来的宽高,重新设置盒们的尺寸
        const setDom = (width, height, imgDom) => {
          // 设置父盒子尺寸
          this.boxDom.style = `width: ${width}px; height: ${height}px;`
          
          // 生成并设置canvsa尺寸和获取ctx
          let dom_canvas_img = document.createElement('canvas')
          dom_canvas_img.width = canvas.width = width * canvas.scale
          dom_canvas_img.height = canvas.height = height * canvas.scale
          dom_canvas_img.style = `transform: scale(${1/canvas.scale})`
  
          let dom_canvas_circle = document.createElement('canvas')
          dom_canvas_circle.width = canvas.width_circle = width * canvas.scale_circle
          dom_canvas_circle.height = canvas.height_circle = height * canvas.scale_circle
          dom_canvas_circle.style = `transform: scale(${1/canvas.scale_circle})`
  
          let dom_canvas_line = document.createElement('canvas')
          dom_canvas_line.width = canvas.width_line = width * canvas.scale_line
          dom_canvas_line.height = canvas.height_line = height * canvas.scale_line
          dom_canvas_line.style = `transform: scale(${1/canvas.scale_line})`
  
          this.boxDom.innerHTML = ''
          this.boxDom.appendChild(dom_canvas_img)
          this.boxDom.appendChild(dom_canvas_circle)
          this.boxDom.appendChild(dom_canvas_line)
  
          setTimeout(() => {
            try {
              canvas.ctx = dom_canvas_img.getContext('2d')
              canvas.ctx_line = dom_canvas_circle.getContext('2d')
              canvas.ctx_circle = dom_canvas_line.getContext('2d')
              resolve(imgDom || null)
            } catch(err) {
              reject(err)
            }
          }, 0)
        }
        
        if (imgUrl) { // 有图片路径, 取图片
          try {
            // 加载图片
            let imgDom = new Image()
            imgDom.src = imgUrl
            imgDom.onload = () => {
              // 图片的尺寸
              let imgWidth = imgDom.naturalWidth
              let imgHeight = imgDom.naturalHeight
  
              let widthToHeight = imgHeight / imgWidth
              let heightToWidth = imgWidth / imgHeight
  
              // 图片加载完成，设置 canvas 尺寸
              if (!width && !height) width = 500
  
              if (width && !height) height = width * widthToHeight
              else if (!width && height) width = height * heightToWidth
              else { // 宽高都有, 那就把图片放进去, 再裁切一个下盒子多余的边角
                // 先依据大盒子的宽度, 按照图片的比例, 算出一个高来
                let tempHeight = width * widthToHeight
  
                // 算出来的高, 小于等于盒子的真实高度, 那这个宽度可取, 修改盒子的高度
                if (tempHeight <= height) height = tempHeight
                else width = height * heightToWidth
              }
  
              setDom(width, height, imgDom)
            }
            imgDom.onerror = error => {
              reject(error)
            }
          } catch(err) {
            reject(err)
          }
        } else { // 没有图片路径, 取盒子大小
          setDom(width || 1000, height || 500)
        }
      })
    }
  }
  window.Draw = Draw
})()