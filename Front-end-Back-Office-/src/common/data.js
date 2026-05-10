import { cryptoOrders, wallet, productData, cryptoOrderData, icoLandingTeam, blogs, orderbookData } from "./data/crypto";
import { invoiceList } from "./data/invoices";
import { projects, projectListData, OverviewTeamMember, projectAssignedTo } from "./data/projects";
import { tasks, recentTasksData, AddTeamMember } from "./data/tasks";
import {
	inboxmails,
	starredmails,
	importantmails,
	draftmails,
	sentmails,
	trashmails,
	mailDB,
	labelsData,
	mailChatData
} from "./data/mails";
import {
	cartData,
	comments,
	customerData,
	discountData,
	orders,
	productsData,
	recentProducts,
	shops,
	productComments
} from "./data/ecommerce";
import { chats, contacts, groups, messages } from "./data/chat";
import { calenderDefaultCategories, events } from "./data/calender";
import { users, userProfile } from "./data/contacts";
import { dahsboardEmail, activityData, latestTransaction, TopCitiesSelling } from "./data/dashboard";
import { jobs, jobListCandidate, jobApply } from "./data/job";

import {
	TopSellingData,
	dashboardEarning,
	chatData, tasksData
} from "./data/dashboard-saas";

import { walletOptions, transactionsDataALL, transactionsDataBuy, transactionsDataSell, notificationsData, cryptoReports } from "./data/dashboard-crypto";

import { jobVacancyData, statisticsApplications, recentAddedJobsData, activityFeedData, chartsData } from "./data/dashboard-job";

import { visitor, blogStatsData, postRecentData, postPopularData, commentsData, progressData, activityBlogData, blogPost } from "./data/dashboard-blog";

import { filesData, filemanagerData, storageData } from "./data/file-manager";

import { categoriesData, archiveData, popularPosts, tagsData } from "./data/blog";

import { jobsGridData, experienceData, jobType } from "./data/job-Grid";

export {
	jobsGridData,
	experienceData,
	jobType,
	tagsData,
	categoriesData,
	archiveData,
	popularPosts,
	AddTeamMember,
	recentTasksData,
	mailChatData,
	labelsData,
	orderbookData,
	storageData,
	filemanagerData,
	filesData,
	activityFeedData,
	chartsData,
	recentAddedJobsData,
	activityBlogData,
	activityData,
	progressData,
	commentsData,
	postPopularData,
	postRecentData,
	notificationsData,
	cryptoReports,
	transactionsDataSell,
	transactionsDataBuy,
	transactionsDataALL,
	tasksData,
	latestTransaction,
	productsData,
	cryptoOrderData,
	discountData,
	events,
	calenderDefaultCategories,
	chats,
	groups,
	contacts,
	messages,
	orders,
	cartData,
	customerData,
	shops,
	recentProducts,
	comments,
	wallet,
	icoLandingTeam,
	inboxmails,
	importantmails,
	draftmails,
	sentmails,
	trashmails,
	starredmails,
	cryptoOrders,
	productData,
	blogs,
	invoiceList,
	projects,
	projectListData,
	TopCitiesSelling,
	OverviewTeamMember,
	projectAssignedTo,
	tasks,
	users,
	userProfile,
	dahsboardEmail,
	TopSellingData,
	dashboardEarning,
	chatData,
	productComments,
	jobs,
	jobListCandidate,
	jobApply,
	walletOptions, jobVacancyData, statisticsApplications, visitor, blogPost, blogStatsData, mailDB
};
