import { useCallback, useEffect, useState } from 'react'
import { Empty, Tooltip } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { File as FileIcon, Folder, FolderOpen, RefreshCw, GitBranch } from 'lucide-react'
import { workspaceApi, openWorkspaceFile } from '@/apis/workspace'
import { formatBytes, formatTime, fromNow } from '@/utils/time'

function formatGitNumber(value, label) {
  if (value == null) return null
  return `${label} ${value}`
}

export default function WorkspacePanel({ agentId, sessionId }) {
  const [listing, setListing] = useState(null)
  const [git, setGit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [path, setPath] = useState('')

  const load = useCallback(
    async (targetPath) => {
      if (!agentId || !sessionId) return
      setLoading(true)
      try {
        const data = await workspaceApi.directories(agentId, sessionId, targetPath || undefined)
        setListing(data)
        setPath(data?.path || targetPath || '')
      } catch (err) {
        message.error(err.message || '加载目录失败')
      } finally {
        setLoading(false)
      }
    },
    [agentId, sessionId]
  )

  useEffect(() => {
    setPath('')
    setListing(null)
    setGit(null)
    if (agentId && sessionId) {
      load('')
      workspaceApi
        .status(agentId, sessionId)
        .then((data) => setGit(data?.git))
        .catch(() => setGit(null))
    }
  }, [agentId, sessionId, load])

  const pathParts = (path || '').split('/').filter(Boolean)
  const entries = listing?.entries || []

  const gitItems = git
    ? [
        git.branch && { label: git.branch, color: 'var(--main-color)' },
        formatGitNumber(git.ahead, '↑'),
        formatGitNumber(git.behind, '↓'),
        formatGitNumber(git.insertions, '+'),
        formatGitNumber(git.deletions, '-'),
        formatGitNumber(git.untracked, '?'),
        formatGitNumber(git.conflicted, '!'),
      ].filter(Boolean)
    : []

  return (
    <div className="workspace-panel">
      <div className="workspace-toolbar">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => load(path)}
          title="刷新"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
        <div className="workspace-crumbs">
          <span className="crumb" onClick={() => load('')}>
            根目录
          </span>
          {pathParts.map((part, index) => (
            <span
              key={index}
              className="crumb"
              onClick={() => load(pathParts.slice(0, index + 1).join('/'))}
            >
              {part}
            </span>
          ))}
        </div>
      </div>

      {gitItems.length > 0 && (
        <div className="workspace-git">
          <GitBranch size={12} />
          {gitItems.map((item, index) => (
            <span key={index} className="git-badge" style={item.color ? { color: item.color } : undefined}>
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div className="workspace-list">
        {!agentId || !sessionId ? (
          <Empty description="选择会话后查看工作区" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : entries.length === 0 && !loading ? (
          <Empty description="空目录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          entries.map((entry) => (
            <div
              key={entry.name}
              className="workspace-entry"
              onClick={() => {
                if (entry.is_dir) load(path ? `${path}/${entry.name}` : entry.name)
              }}
            >
              {entry.is_dir ? (
                <Folder size={15} color="var(--main-color)" style={{ flexShrink: 0 }} />
              ) : (
                <FileIcon size={15} style={{ flexShrink: 0, color: 'var(--gray-400)' }} />
              )}
              <span className="entry-name" title={entry.name}>
                {entry.name}
              </span>
              {entry.updated_at && (
                <Tooltip title={formatTime(entry.updated_at)}>
                  <span className="entry-meta">{fromNow(entry.updated_at)}</span>
                </Tooltip>
              )}
              {!entry.is_dir && entry.size_bytes != null && (
                <span className="entry-meta">{formatBytes(entry.size_bytes)}</span>
              )}
              {!entry.is_dir && (
                <Tooltip title="打开文件">
                  <button
                    type="button"
                    className="sidebar-toggle"
                    style={{ opacity: 0.6 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      openWorkspaceFile(agentId, sessionId, path ? `${path}/${entry.name}` : entry.name).catch(
                        (err) => message.error(err.message || '打开文件失败')
                      )
                    }}
                  >
                    <FolderOpen size={13} />
                  </button>
                </Tooltip>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
