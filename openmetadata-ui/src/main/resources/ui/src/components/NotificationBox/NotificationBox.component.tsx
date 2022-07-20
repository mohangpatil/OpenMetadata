/*
 *  Copyright 2022 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Badge, Button, List, Tabs } from 'antd';
import { AxiosError, AxiosResponse } from 'axios';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppState from '../../AppState';
import { getFeedsWithFilter } from '../../axiosAPIs/feedsAPI';
import { getUserPath } from '../../constants/constants';
import { FeedFilter } from '../../enums/mydata.enum';
import { ThreadType } from '../../generated/api/feed/createThread';
import { Post, Thread } from '../../generated/entity/feed/thread';
import jsonData from '../../jsons/en';
import { getEntityFQN, getEntityType } from '../../utils/FeedUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import Loader from '../Loader/Loader';
import { NotificationBoxProp } from './NotificationBox.interface';
import { tabsInfo } from './NotificationBox.utils';
import NotificationFeedCard from './NotificationFeedCard.component';

const NotificationBox = ({
  hasMentionNotification,
  hasTaskNotification,
  onMarkTaskNotificationRead,
  onMarkMentionsNotificationRead,
  onTabChange,
}: NotificationBoxProp) => {
  const currentUser = useMemo(
    () => AppState.getCurrentUserDetails(),
    [AppState.userDetails, AppState.nonSecureUserDetails]
  );
  const [notifications, setNotifications] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [icon, setIcon] = useState<JSX.Element>(
    <SVGIcons alt="" className="tw-mr-2" icon={Icons.TASK} width="14px" />
  );
  const [viewAllPath, setViewAllPath] = useState<string>(
    `${getUserPath(currentUser?.name as string)}/tasks?feedFilter=ASSIGNED_TO`
  );

  const notificationDropDownList = useMemo(() => {
    return notifications.slice(0, 5).map((feed, idx) => {
      const mainFeed = {
        message: feed.message,
        postTs: feed.threadTs,
        from: feed.createdBy,
        id: feed.id,
        reactions: feed.reactions,
      } as Post;
      const entityType = getEntityType(feed.about);
      const entityFQN = getEntityFQN(feed.about);

      return (
        <NotificationFeedCard
          createdBy={mainFeed.from}
          entityFQN={entityFQN as string}
          entityType={entityType as string}
          feedType={feed.type || ThreadType.Conversation}
          icon={icon}
          key={`${mainFeed.from} ${idx}`}
          taskDetails={feed.task}
        />
      );
    });
  }, [notifications]);

  const getNotificationData = (
    threadType: ThreadType,
    feedFilter: FeedFilter
  ) => {
    setIsLoading(true);
    getFeedsWithFilter(currentUser?.id, feedFilter, undefined, threadType)
      .then((res: AxiosResponse) => {
        setNotifications(res.data.data);
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-activity-feed-error']
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getFilters = (activeTab: ThreadType) => ({
    threadType: activeTab,
    feedFilter:
      activeTab === ThreadType.Task
        ? FeedFilter.ASSIGNED_TO
        : FeedFilter.MENTIONS,
  });

  const updateActiveTab = useCallback(
    (key: string) => {
      onTabChange(key);
      const { threadType, feedFilter } = getFilters(key as ThreadType);

      getNotificationData(threadType, feedFilter);
      setIcon(
        <SVGIcons
          alt=""
          className="tw-mr-2"
          icon={key === 'Task' ? Icons.TASK : Icons.MENTIONS}
          width="14px"
        />
      );
      setViewAllPath(
        `${getUserPath(
          currentUser?.name as string
        )}/${threadType.toLowerCase()}?feedFilter=${feedFilter}`
      );

      if (hasTaskNotification || hasMentionNotification) {
        setTimeout(() => {
          key === 'Task'
            ? onMarkTaskNotificationRead()
            : onMarkMentionsNotificationRead();
        }, 4000);
      }
    },
    [currentUser, hasTaskNotification, hasMentionNotification]
  );

  useEffect(() => {
    getNotificationData(ThreadType.Task, FeedFilter.ASSIGNED_TO);
  }, []);

  const getTabTitle = (name: string, key: string) => {
    return (
      <Badge
        dot={key === 'Task' ? hasTaskNotification : hasMentionNotification}
        offset={[5, 0]}>
        <SVGIcons
          alt=""
          className="tw-mr-2"
          icon={key === 'Task' ? Icons.TASK : Icons.MENTIONS}
          width="14px"
        />
        {name}
      </Badge>
    );
  };

  return (
    <div className="tw-bg-white tw-border tw-border-gray-100 tw-rounded tw-flex tw-flex-col tw-justify-between tw-shadow-lg">
      <div className="tw-flex tw-justify-between">
        <div
          className="tw-text-base tw-font-medium tw-px-4 tw-pt-3 tw-pb-1"
          data-testid="notification-heading">
          Notifications
        </div>
        <Button href={viewAllPath} type="link">
          <span className="tw-pt-2.5">view all</span>
        </Button>
      </div>

      <Tabs
        defaultActiveKey="Task"
        size="small"
        tabBarGutter={24}
        tabBarStyle={{
          borderBottom: '1px solid #DCE3EC',
          margin: '0px',
          paddingLeft: '16px',
          color: 'inherit',
        }}
        onTabClick={updateActiveTab}>
        {tabsInfo.map(({ name, key }) => (
          <Tabs.TabPane key={key} tab={getTabTitle(name, key)}>
            {isLoading ? (
              <div className="tw-h-64 tw-flex tw-items-center tw-justify-center">
                <Loader size="small" />
              </div>
            ) : (
              <div className="tw-h-64 tw-overflow-scroll">
                {isEmpty(notifications) ? (
                  <div className="tw-h-full tw-flex tw-items-center tw-justify-center">
                    <p>{`No ${name} Found`}</p>
                  </div>
                ) : (
                  <List
                    dataSource={notificationDropDownList}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          padding: '10px 0px 10px 16px',
                        }}>
                        {item}
                      </List.Item>
                    )}
                  />
                )}
              </div>
            )}
          </Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
};

export default NotificationBox;