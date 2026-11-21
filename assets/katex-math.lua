local function escape_html(value)
  return value:gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;')
end

function Math(element)
  local source = escape_html(element.text)
  if element.mathtype == 'DisplayMath' then
    return pandoc.RawInline('html', '<span class="math display">$$' .. source .. '$$</span>')
  end
  return pandoc.RawInline('html', '<span class="math inline">\\(' .. source .. '\\)</span>')
end
