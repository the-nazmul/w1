# set working directory to the folder containing this script (requires script to be run in RStudio)
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# load required packages
library(tidyverse)
library(janitor)
library(tidygeocoder)
library(lubridate)
library(zoo)

# load data
ejk <- read_csv("processed_data/ejk_edit.csv") %>%
  clean_names()

# check data types
glimpse(ejk)

# create new columns for cleaned date and location including country name
ejk <- ejk %>%
  mutate(date2 = dmy(dates),
         location2 = paste0(location, " , Bangladesh"),
         incident_id = as.character(incident_id))

# attempt to geocode locations
ejk <- geocode(ejk,
               address = location2,
               method = "arcgis",
               full_results = TRUE) %>%
  select(1:35)

# fill in missing dates etc
ejk <- ejk %>%
  group_by(incident_id) %>%
  mutate(date2 = na.locf(date2, na.rm=FALSE),
         description = na.locf(description, na.rm=FALSE),
         sources = na.locf(scources, na.rm=FALSE))

# write to csv
write.csv(ejk, "processed_data/ejk_edit2.csv", row.names = FALSE, na = "")


# load data
ejk <- read_csv("processed_data/ejk_edit3.csv") %>%
  select(1:21) %>%
  mutate(location2 = paste0(location, " , Bangladesh"))

ejk <- geocode(ejk,
               address = location2,
               method = "arcgis",
               full_results = TRUE)

ejk <- ejk %>%
  select(1:26) %>%
  mutate(date2 = dmy(dates))

write_csv(ejk, "processed_data/ejk_edit4.csv", na = "")





