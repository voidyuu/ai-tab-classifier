#!/bin/bash

# 图标生成脚本
# 需要安装 ImageMagick: brew install imagemagick

echo "正在生成Chrome扩展图标..."

cd "$(dirname "$0")"

# 检查是否安装了 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "错误: 未找到 ImageMagick"
    echo "请安装: brew install imagemagick"
    exit 1
fi

# 创建临时HTML文件用于生成图标
create_icon() {
    local size=$1
    local output=$2
    
    cat > temp_icon.svg << EOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="$size" height="$size" rx="$(($size/6))" fill="url(#grad1)"/>
  <text x="$(($size/2))" y="$(($size*7/10))" font-size="$(($size*9/16))" text-anchor="middle" fill="white">🤖</text>
</svg>
EOF

    # 如果系统支持rsvg-convert，使用它来转换SVG
    if command -v rsvg-convert &> /dev/null; then
        rsvg-convert -w $size -h $size temp_icon.svg -o "$output"
    else
        # 否则使用ImageMagick
        convert -background none -size ${size}x${size} temp_icon.svg "$output"
    fi
    
    rm temp_icon.svg
    echo "✓ 已生成 $output"
}

# 生成不同尺寸的图标
create_icon 16 "icons/icon16.png"
create_icon 48 "icons/icon48.png"
create_icon 128 "icons/icon128.png"

echo "✓ 所有图标生成完成！"
echo ""
echo "如果生成失败，您也可以："
echo "1. 访问 https://www.favicon-generator.org/"
echo "2. 上传一个图片"
echo "3. 生成16x16、48x48、128x128尺寸的PNG图标"
echo "4. 将它们重命名并放入 icons/ 目录"
