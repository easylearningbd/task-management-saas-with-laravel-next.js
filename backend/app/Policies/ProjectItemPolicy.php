<?php

namespace App\Policies;

/** A company works only with its own ProjectItem records (CompanyOwnedPolicy). */
class ProjectItemPolicy extends CompanyOwnedPolicy {}
