# set working directory to the folder containing this script (requires script to be run in RStudio)
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# load required packages
library(tidyverse)
library(lubridate)

# load data and process data
ejk <- read_csv("processed_data/ejk_edit_6.csv") %>%
  mutate(year = year(date2),
         month = month(date2),
         mid_month_date = ymd(paste0(year,"-",month,"_15")))

glimpse(ejk)

# prep data for datawrapper charts
total_incidents_victims_month <- ejk %>%
  group_by(mid_month_date) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))

write_csv(total_incidents_victims_month,"processed_data/total_incidents_victims_month.csv", na = "")

rab_police_incidents_victims_month <- ejk %>%
  filter(grepl("rab|police", agencies, ignore.case = TRUE)) %>%
  group_by(mid_month_date) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))

write_csv(rab_police_incidents_victims_month,"processed_data/rab_police_incidents_victims_month.csv", na = "")

bgb_incidents_victims_month <- ejk %>%
  filter(grepl("bgb", agencies, ignore.case = TRUE)) %>%
  group_by(mid_month_date) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))

write_csv(bgb_incidents_victims_month,"processed_data/bgb_incidents_victims_month.csv", na = "")


